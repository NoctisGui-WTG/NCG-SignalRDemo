using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using DemoScoreApp.Models;
using System.Text;

namespace DemoScoreApp.Hubs;

public class ScoreCalculationStore
{
	private readonly ConcurrentDictionary<Guid, ScoreCalculationState> _states = new();
	public ScoreCalculationState Create(string method)
	{
		var state = ScoreCalculationState.Create(method);
		_states[state.Id] = state;
		return state;
	}
	public bool TryGet(Guid id, out ScoreCalculationState? state) => _states.TryGetValue(id, out state);
	public void Remove(Guid id) => _states.TryRemove(id, out _);
}

public class ScoreHub : Hub
{
	private readonly ScoreCalculationStore _store;
	private static readonly string[] SubjectOrder = { "数学", "语文", "英语", "物理" };
	private readonly Random _random = new();
	private static readonly string[] FailReasons =
	{
		"作弊",
		"题目看错，失误较多",
		"粗心大意，计算错误频繁",
		"复习不充分，知识点遗忘",
		"时间分配不合理，后面题没做完"
	};

	private static string BuildResultTitle(ScoreCalculationState state)
	{
		if (state.FailReasonsBySubject.Count == 0) return "结果";
		var sb = new StringBuilder();
		sb.AppendLine("不及格");
		foreach (var kv in state.FailReasonsBySubject)
			sb.AppendLine($"{kv.Key} {kv.Value}");
		return sb.ToString().TrimEnd();
	}

	public ScoreHub(ScoreCalculationStore store) => _store = store;

	// 连接事件：当用户连接时通知所有其他用户
	public override async Task OnConnectedAsync()
	{
		var connectionId = Context.ConnectionId;
		await Clients.Others.SendAsync("UserConnected", new 
		{ 
			connectionId, 
			message = $"新用户已连接 (ID: {connectionId.Substring(0, 8)}...)",
			timestamp = DateTime.Now 
		});
		await base.OnConnectedAsync();
	}

	// 断开连接事件：当用户断开时通知所有其他用户
	public override async Task OnDisconnectedAsync(Exception? exception)
	{
		var connectionId = Context.ConnectionId;
		await Clients.Others.SendAsync("UserDisconnected", new 
		{ 
			connectionId, 
			message = $"用户已断开 (ID: {connectionId.Substring(0, 8)}...)",
			timestamp = DateTime.Now 
		});
		await base.OnDisconnectedAsync(exception);
	}

	// 广播消息：允许用户发送广播消息给所有人
	public async Task BroadcastMessage(string message)
	{
		var connectionId = Context.ConnectionId;
		await Clients.All.SendAsync("BroadcastReceived", new
		{
			from = connectionId.Substring(0, 8),
			message,
			timestamp = DateTime.Now
		});
	}

	public async Task StartCalculation(string method)
	{
		if (method != "1" && method != "2")
		{
			await Clients.Caller.SendAsync("Error", new { message = "无效的计算方式" });
			return;
		}

		var state = _store.Create(method);
		foreach (var subject in SubjectOrder)
			state.Scores[subject] = _random.Next(0, 101);

		// 通知其他用户：有人开始了计算
		var connectionId = Context.ConnectionId;
		await Clients.Others.SendAsync("OtherUserStartedCalculation", new
		{
			userId = connectionId.Substring(0, 8),
			method = method == "1" ? "逐科计算" : "批量计算",
			timestamp = DateTime.Now
		});

		if (method == "1")
			await ProcessSequential(state);
		else
			await ProcessBatch(state);
	}

	private async Task ProcessSequential(ScoreCalculationState state)
	{
		for (; state.CurrentIndex < SubjectOrder.Length; state.CurrentIndex++)
		{
			var subject = SubjectOrder[state.CurrentIndex];
			var score = state.Scores[subject];
			state.Total += score;

			await Clients.Caller.SendAsync("SubjectProgress", new
			{
				calculationId = state.Id,
				subject,
				score,
				index = state.CurrentIndex,
				resultTitle = BuildResultTitle(state),
				allReasons = state.FailReasonsBySubject
			});

			if (score < 60)
			{
				state.WaitingForUser = true;
				state.CurrentFailSubject = subject; // 仅记录科目
				await Clients.Caller.SendAsync("FailEncountered", new
				{
					calculationId = state.Id,
					subject,
					score,
					message = $"{subject} 不及格（{score}），要查看原因还是继续计算？",
					resultTitle = BuildResultTitle(state),
					hasReason = true
				});
				return; // 等待用户操作
			}

			await Task.Delay(300);
		}

		await SendCompletion(state);
	}

	public async Task ContinueAfterFail(Guid calculationId)
	{
		if (!_store.TryGet(calculationId, out var state) || state is null)
		{
			await Clients.Caller.SendAsync("Error", new { message = "未找到计算任务" });
			return;
		}
		if (!state.WaitingForUser)
		{
			await Clients.Caller.SendAsync("Error", new { message = "当前不需要继续操作" });
			return;
		}

		state.WaitingForUser = false;
		state.CurrentFailSubject = null;
		state.CurrentIndex++;

		if (state.CurrentIndex >= SubjectOrder.Length)
		{
			await SendCompletion(state);
			return;
		}

		await ProcessSequential(state);
	}

	public async Task GetFailReason(Guid calculationId)
	{
		if (!_store.TryGet(calculationId, out var state) || state is null)
		{
			await Clients.Caller.SendAsync("Error", new { message = "未找到计算任务" });
			return;
		}
		if (!state.WaitingForUser || state.CurrentFailSubject is null)
		{
			await Clients.Caller.SendAsync("Error", new { message = "当前没有可查看的原因" });
			return;
		}

		var subject = state.CurrentFailSubject;
		var reason = FailReasons[_random.Next(FailReasons.Length)];
		state.LastFailReason = reason;
		state.FailReasonsBySubject[subject] = reason;

		await Clients.Caller.SendAsync("FailReason", new
		{
			calculationId,
			subject,
			reason,
			reasons = state.FailReasonsBySubject,
			resultTitle = BuildResultTitle(state)
		});
	}

	public async Task AbortCalculation(Guid calculationId)
	{
		if (!_store.TryGet(calculationId, out var state) || state is null)
		{
			await Clients.Caller.SendAsync("Error", new { message = "未找到计算任务" });
			return;
		}
		_store.Remove(calculationId);
		await Clients.Caller.SendAsync("CalculationAborted", new { calculationId });
	}

	private async Task ProcessBatch(ScoreCalculationState state)
	{
		foreach (var v in state.Scores.Values)
			state.Total += v;

		var failed = state.Scores.Where(kv => kv.Value < 60).Select(kv => kv.Key).ToList();
		await Clients.Caller.SendAsync("CalculationComplete", new
		{
			calculationId = state.Id,
			scores = state.Scores,
			total = state.Total,
			failedSubjects = failed,
			method = state.Method,
			resultTitle = BuildResultTitle(state),
			reasons = state.FailReasonsBySubject
		});

		_store.Remove(state.Id);
	}

	private async Task SendCompletion(ScoreCalculationState state)
	{
		var failed = state.Scores.Where(kv => kv.Value < 60).Select(kv => kv.Key).ToList();
		await Clients.Caller.SendAsync("CalculationComplete", new
		{
			calculationId = state.Id,
			scores = state.Scores,
			total = state.Total,
			failedSubjects = failed,
			method = state.Method,
			resultTitle = BuildResultTitle(state),
			reasons = state.FailReasonsBySubject
		});
		_store.Remove(state.Id);
	}
}