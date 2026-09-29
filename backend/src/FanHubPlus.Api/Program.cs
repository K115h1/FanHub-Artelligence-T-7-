// Program.cs, composition root. Registers services, auth, CORS and Swagger.
// No business logic here; the SRS puts that in the Application layer.
using System.Text;
using FanHubPlus.Api.Services;
using FanHubPlus.Application;
using FanHubPlus.Application.Services;
using FanHubPlus.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

// `--hash-password <value>` is a maintenance command, not a server run: it
// prints a seedable hash and exits without opening a port.
if (FanHubPlus.Api.HashPassword.TryRun(args))
{
    return;
}

var builder = WebApplication.CreateBuilder(args);

// Application + Infrastructure. Both read configuration for connection strings
// and JWT signing, which come from user-secrets or the environment.
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();

// The JWT issuer lives in the Api layer, not Application, so the business
// layer stays free of the HTTP stack.
builder.Services.AddScoped<ITokenService, JwtTokenService>();

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException(
        "Jwt:Key is not set. Add it with: dotnet user-secrets set \"Jwt:Key\" \"<a-long-random-string>\"");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "FanHubPlus",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "FanHubPlusClient",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        // The React dev server runs on a different port to the API, so the
        // browser needs an explicit allowance. Credentials are on because the
        // frontend sends the bearer token, not cookies.
        policy.WithOrigins(
                builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                ?? ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"])
            .AllowAnyHeader()
            .AllowAnyMethod()));

builder.Services.AddHttpContextAccessor();

var app = builder.Build();

// Serves uploaded avatars out of wwwroot/images/avatars. Before routing and
// before authentication, because these are public files referenced by a plain
// img element (src) that carries no bearer token.
//
// The directory must exist BEFORE UseStaticFiles runs. UseStaticFiles builds a
// PhysicalFileProvider over wwwroot at startup, and if that folder is missing at
// that moment the provider 404s everything, including files written later. A
// fresh clone has no wwwroot at all, so this is the normal case, not an edge one.
System.IO.Directory.CreateDirectory(
    Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "images", "avatars"));

app.UseStaticFiles();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// /health is what the frontend's http.ts calls to check the API is up.
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// Swagger is on in Development only; the SRS asks for API documentation and a
// production deploy should not expose it.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.Run();
