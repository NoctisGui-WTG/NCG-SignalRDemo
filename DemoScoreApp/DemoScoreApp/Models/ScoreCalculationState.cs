namespace DemoScoreApp.Models;

public class ScoreCalculationState
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Method { get; set; } = "1";
    public Dictionary<string, int> Scores { get; set; } = new();
    public int CurrentIndex { get; set; } = 0;
    public int Total { get; set; } = 0;
    public bool WaitingForUser { get; set; } = false;
    public string? LastFailReason { get; set; } = null; // 兼容旧字段
    public Dictionary<string, string> FailReasonsBySubject { get; set; } = new(); // 已生成的原因
    public string? CurrentFailSubject { get; set; } = null; // 当前等待继续/查看原因的不及格科目

    public static ScoreCalculationState Create(string method) =>
        new() { Method = method };
}