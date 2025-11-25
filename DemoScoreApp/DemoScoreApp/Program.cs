using DemoScoreApp.Hubs;
using DemoScoreApp.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddSingleton<ScoreCalculationStore>();
builder.Services.AddHostedService<BackgroundNotificationService>();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapHub<ScoreHub>("/scoreHub");

app.Run();