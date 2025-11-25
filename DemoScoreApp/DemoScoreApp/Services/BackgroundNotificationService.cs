using Microsoft.AspNetCore.SignalR;
using DemoScoreApp.Hubs;

namespace DemoScoreApp.Services;

/// <summary>
/// 后台服务：演示后端主动推送消息到前端
/// </summary>
public class BackgroundNotificationService : BackgroundService
{
    private readonly IHubContext<ScoreHub> _hubContext;
    private readonly ILogger<BackgroundNotificationService> _logger;

    public BackgroundNotificationService(
        IHubContext<ScoreHub> hubContext,
        ILogger<BackgroundNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("BackgroundNotificationService started");

        while (!stoppingToken.IsCancellationRequested)
        {
            // 每30秒向所有客户端推送一次系统时间
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

            var message = new
            {
                timestamp = DateTime.Now,
                message = "系统定时推送",
                serverTime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            };

            await _hubContext.Clients.All.SendAsync("SystemNotification", message, stoppingToken);
            _logger.LogInformation("System notification sent to all clients");
        }
    }
}
