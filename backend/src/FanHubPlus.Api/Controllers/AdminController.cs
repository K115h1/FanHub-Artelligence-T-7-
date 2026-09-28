// Admin endpoints. Every action here requires the admin role — the guard is on
// the controller, so a new action cannot accidentally be left unprotected.
//
// The client also hides /admin from non-admins, but that is convenience only.
// This attribute is the actual check.
using FanHubPlus.Application.DTOs;
using FanHubPlus.Application.Services;
using FanHubPlus.Infrastructure;
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

    /// <summary>Most-used genres, so the stats page need not hold the catalogue.</summary>
    [HttpGet("stats/genres")]
    public Task<IActionResult> GenreStats([FromQuery] int take = 20) =>
        Guarded(async () => Ok(await _admin.GetGenreStatsAsync(take, HttpContext.RequestAborted)));

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

    /// <summary>
    /// Paged catalogue for the admin content manager.
    /// </summary>
    /// <remarks>
    /// status and genre are exposed here because ContentQuery already supports
    /// both and the content manager has filters for them. The admin view used to
    /// hold the entire 2,490-row catalogue in the browser and filter it in
    /// memory, which is why those filters never needed a server round trip; once
    /// paging moved to the database they do, and dropping them instead would have
    /// quietly removed two controls from the panel.
    /// </remarks>
    [HttpGet("contents")]
    public Task<IActionResult> BrowseContents(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] string? status,
        [FromQuery] int? genreId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string sort = "title") =>
        Guarded(async () =>
        {
            var query = new Infrastructure.ContentQuery
            {
                Search = search,
                CategorySlug = category,
                // The enums are parsed, not passed through: an unrecognised value
                // must not silently mean "no filter", which would show the
                // administrator the whole catalogue when they asked for one status.
                Status = ParseContentStatus(status),
                GenreId = genreId is > 0 ? (ushort?)genreId.Value : null,
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
            if (!EnumConverter.TryParse<FeedbackStatus>(request.Status, out var status))
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
        [FromQuery] string? status, [FromQuery] string? kind,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25) =>
        // The admin queue is every submission, so userId stays null. Named,
        // because the optional userId filter sits before the token.
        Guarded(async () => Ok(await _community.GetSubmissionsAsync(
            ParseSubmissionStatus(status), page, pageSize, userId: null,
            ParseSubmissionKind(kind), HttpContext.RequestAborted)));

    /// Counts per status, so the queue's filter chips cost one request.
    [HttpGet("submissions/counts")]
    public Task<IActionResult> SubmissionCounts() =>
        Guarded(async () => Ok(await _community.GetSubmissionCountsAsync(HttpContext.RequestAborted)));

    [HttpPut("submissions/{id:int}/status")]
    public Task<IActionResult> SetSubmissionStatus(uint id, UpdateSubmissionStatusRequest request) =>
        Guarded(async () =>
        {
            if (!EnumConverter.TryParse<SubmissionStatus>(request.Status, out var status))
                throw new ValidationException("Status must be pending, approved or rejected.");

            // The note is optional, but the admin queue prompts for one on a
            // rejection, because a rejected fan is owed a reason.
            await _community.SetSubmissionStatusAsync(
                id, status, RequireUserId(), request.Note, HttpContext.RequestAborted);
            return NoContent();
        });

    private static FeedbackStatus? ParseFeedbackStatus(string? value) =>
        EnumConverter.TryParse<FeedbackStatus>(value, out var parsed) ? parsed : null;

    private static SubmissionStatus? ParseSubmissionStatus(string? value) =>
        EnumConverter.TryParse<SubmissionStatus>(value, out var parsed) ? parsed : null;

    private static SubmissionKind? ParseSubmissionKind(string? value) =>
        EnumConverter.TryParse<SubmissionKind>(value, out var parsed) ? parsed : null;

    /// <summary>
    /// Parse a contents.status filter, distinguishing "not supplied" from
    /// "supplied but unrecognised".
    /// </summary>
    /// <remarks>
    /// The other two Parse helpers return null for both cases, which is right
    /// for feedback and submissions because the enum is a small fixed set the UI
    /// only ever sends from a dropdown. For contents the admin type claimed three
    /// values (released/announced/discontinued) while the column allows five
    /// (released/upcoming/ongoing/ended/cancelled), so a stale value really can
    /// arrive. Treating that as "no filter" would quietly show the whole
    /// catalogue when the administrator asked for one status, so an unrecognised
    /// value is rejected loudly instead.
    /// </remarks>
    private static ContentStatus? ParseContentStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (Enum.TryParse<ContentStatus>(value, ignoreCase: true, out var parsed)) return parsed;
        throw new ValidationException(
            $"Status must be one of: {string.Join(", ", Enum.GetNames<ContentStatus>())}.");
    }
}

public record SetRoleRequest(string Role);
