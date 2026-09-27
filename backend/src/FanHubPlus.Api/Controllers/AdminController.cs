// Admin endpoints. Every action here requires the admin role — the guard is on
// the controller, so a new action cannot accidentally be left unprotected.
//
// The client also hides /admin from non-admins, but that is convenience only.
// This attribute is the actual check.
using FanHubPlus.Application.DTOs;
using FanHubPlus.Application.Services;
using FanHubPlus.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanHubPlus.Api.Controllers;

[Authorize(Roles = "admin")]
[Route("api/admin")]
public class AdminController : ApiControllerBase
{
    private readonly IAdminService _admin;
    private readonly IContentService _content;
    private readonly ICommunityService _community;

    public AdminController(
        IAdminService admin,
        IContentService content,
        ICommunityService community)
    {
        _admin = admin;
        _content = content;
        _community = community;
    }

    [HttpGet("stats")]
    public Task<IActionResult> Stats() =>
        Guarded(async () => Ok(await _admin.GetStatsAsync(HttpContext.RequestAborted)));

    [HttpGet("stats/categories")]
    public Task<IActionResult> CategoryStats() =>
        Guarded(async () => Ok(await _admin.GetCategoryStatsAsync(HttpContext.RequestAborted)));

    [HttpGet("users")]
    public Task<IActionResult> Users() =>
        Guarded(async () => Ok(await _admin.GetUsersAsync(HttpContext.RequestAborted)));

    [HttpPut("users/{id:int}/role")]
    public Task<IActionResult> SetRole(uint id, SetRoleRequest request) =>
        Guarded(async () =>
        {
            await _admin.SetUserRoleAsync(id, request.Role, RequireUserId(), HttpContext.RequestAborted);
            return NoContent();
        });

    // ---- catalogue management ----

    [HttpGet("contents")]
    public Task<IActionResult> BrowseContents(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string sort = "title") =>
        Guarded(async () =>
        {
            var query = new Infrastructure.ContentQuery
            {
                Search = search,
                CategorySlug = category,
                Page = page,
                PageSize = pageSize,
                SortBy = sort,
            };

            return Ok(await _content.BrowseAsync(query, null, HttpContext.RequestAborted));
        });

    [HttpPost("contents")]
    public Task<IActionResult> CreateContent(CreateContentRequest request) =>
        Guarded(async () => Ok(await _content.CreateAsync(request, RequireUserId(), HttpContext.RequestAborted)));

    [HttpPut("contents/{id:int}")]
    public Task<IActionResult> UpdateContent(uint id, UpdateContentRequest request) =>
        Guarded(async () => Ok(await _content.UpdateAsync(id, request, RequireUserId(), HttpContext.RequestAborted)));

    [HttpDelete("contents/{id:int}")]
    public Task<IActionResult> DeleteContent(uint id) =>
        Guarded(async () => await _content.DeleteAsync(id, RequireUserId(), HttpContext.RequestAborted)
            ? NoContent()
            : NotFound());

    // ---- moderation ----

    [HttpGet("feedback")]
    public Task<IActionResult> Feedback(
        [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 25) =>
        Guarded(async () => Ok(await _community.GetFeedbackAsync(
            ParseFeedbackStatus(status), page, pageSize, HttpContext.RequestAborted)));

    [HttpPut("feedback/{id:int}/status")]
    public Task<IActionResult> SetFeedbackStatus(uint id, UpdateFeedbackStatusRequest request) =>
        Guarded(async () =>
        {
            if (!Enum.TryParse<FeedbackStatus>(request.Status, ignoreCase: true, out var status))
                throw new ValidationException("Status must be open, reviewed, resolved or dismissed.");

            await _community.SetFeedbackStatusAsync(id, status, RequireUserId(), HttpContext.RequestAborted);
            return NoContent();
        });

    [HttpDelete("feedback/{id:int}")]
    public Task<IActionResult> DeleteFeedback(uint id) =>
        Guarded(async () =>
        {
            await _community.DeleteFeedbackAsync(id, RequireUserId(), HttpContext.RequestAborted);
            return NoContent();
        });

    [HttpGet("submissions")]
    public Task<IActionResult> Submissions(
        [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 25) =>
        Guarded(async () => Ok(await _community.GetSubmissionsAsync(
            ParseSubmissionStatus(status), page, pageSize, HttpContext.RequestAborted)));

    [HttpPut("submissions/{id:int}/status")]
    public Task<IActionResult> SetSubmissionStatus(uint id, UpdateSubmissionStatusRequest request) =>
        Guarded(async () =>
        {
            if (!Enum.TryParse<SubmissionStatus>(request.Status, ignoreCase: true, out var status))
                throw new ValidationException("Status must be pending, approved or rejected.");

            await _community.SetSubmissionStatusAsync(id, status, RequireUserId(), HttpContext.RequestAborted);
            return NoContent();
        });

    private static FeedbackStatus? ParseFeedbackStatus(string? value) =>
        Enum.TryParse<FeedbackStatus>(value, ignoreCase: true, out var parsed) ? parsed : null;

    private static SubmissionStatus? ParseSubmissionStatus(string? value) =>
        Enum.TryParse<SubmissionStatus>(value, ignoreCase: true, out var parsed) ? parsed : null;
}

public record SetRoleRequest(string Role);
