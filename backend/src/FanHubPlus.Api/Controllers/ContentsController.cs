// Catalogue endpoints: browse, detail, categories, genres, plus per-user
// bookmarks and ratings.
using FanHubPlus.Application.DTOs;
using FanHubPlus.Application.Services;
using FanHubPlus.Domain;
using FanHubPlus.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanHubPlus.Api.Controllers;

[Route("api/contents")]
public class ContentsController : ApiControllerBase
{
    private readonly IContentService _content;

    public ContentsController(IContentService content)
    {
        _content = content;
    }

    /// GET /api/contents?search=&category=&genre=&type=&status=&yearFrom=&yearTo=&page=&pageSize=&sort=
    [HttpGet]
    [AllowAnonymous]
    public Task<IActionResult> Browse(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] ushort? genre,
        [FromQuery] string? type,
        [FromQuery] string? status,
        [FromQuery] int? yearFrom,
        [FromQuery] int? yearTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        [FromQuery] string sort = "popular") =>
        Guarded(async () =>
        {
            var query = new ContentQuery
            {
                Search = search,
                CategorySlug = category,
                GenreId = genre,
                Type = ParseType(type),
                Status = ParseStatus(status),
                YearFrom = yearFrom,
                YearTo = yearTo,
                Page = page,
                PageSize = pageSize,
                SortBy = sort,
            };

            return Ok(await _content.BrowseAsync(query, CurrentUserId, HttpContext.RequestAborted));
        });

    /// GET /api/contents/{slug}?category=anime
    ///
    /// The category is optional and only needed when one slug exists in more
    /// than one fandom, which is why the service takes the slug not the id.
    [HttpGet("{slug}")]
    [AllowAnonymous]
    public Task<IActionResult> GetBySlug(string slug, [FromQuery] string? category) =>
        Guarded(async () =>
        {
            var dto = await _content.GetDetailAsync(slug, category, CurrentUserId, HttpContext.RequestAborted);
            return dto is null ? NotFound() : Ok(dto);
        });

    /// GET /api/contents/id/{id}
    [HttpGet("id/{id:int}")]
    [AllowAnonymous]
    public Task<IActionResult> GetById(uint id) =>
        Guarded(async () =>
        {
            var dto = await _content.GetByIdAsync(id, CurrentUserId, HttpContext.RequestAborted);
            return dto is null ? NotFound() : Ok(dto);
        });

    [HttpGet("categories")]
    [AllowAnonymous]
    public Task<IActionResult> Categories() =>
        Guarded(async () => Ok(await _content.GetCategoriesAsync(HttpContext.RequestAborted)));

    [HttpGet("genres")]
    [AllowAnonymous]
    public Task<IActionResult> Genres([FromQuery] byte? categoryId) =>
        Guarded(async () => Ok(await _content.GetGenresAsync(categoryId, HttpContext.RequestAborted)));

    /// Records a view. Fire-and-forget from the client, so a failure here is
    /// not worth surfacing.
    [HttpPost("{id:int}/view")]
    [AllowAnonymous]
    public async Task<IActionResult> RecordView(uint id)
    {
        var dto = await _content.GetByIdAsync(id, null, HttpContext.RequestAborted);
        if (dto is null) return NotFound();
        return NoContent();
    }

    [HttpPost("{id:int}/rating")]
    [Authorize]
    public Task<IActionResult> Rate(uint id, RatingRequest request) =>
        Guarded(async () => Ok(await _content.SetRatingAsync(RequireUserId(), id, request.Stars, HttpContext.RequestAborted)));

    [HttpDelete("{id:int}/rating")]
    [Authorize]
    public Task<IActionResult> ClearRating(uint id) =>
        Guarded(async () => await _content.RemoveRatingAsync(RequireUserId(), id, HttpContext.RequestAborted)
            ? NoContent()
            : NotFound());

    /// Toggles, so the frontend's save/unsave button is one call either way.
    [HttpPost("{id:int}/bookmark")]
    [Authorize]
    public Task<IActionResult> ToggleBookmark(uint id, BookmarkNoteRequest? request) =>
        Guarded(async () => Ok(await _content.ToggleBookmarkAsync(
            RequireUserId(), id, request?.Note, HttpContext.RequestAborted)));

    [HttpGet("bookmarks")]
    [Authorize]
    public Task<IActionResult> MyBookmarks() =>
        Guarded(async () => Ok(await _content.GetBookmarksAsync(RequireUserId(), HttpContext.RequestAborted)));

    private static ContentType? ParseType(string? value) =>
        Enum.TryParse<ContentType>(value, ignoreCase: true, out var parsed) ? parsed : null;

    private static ContentStatus? ParseStatus(string? value) =>
        Enum.TryParse<ContentStatus>(value, ignoreCase: true, out var parsed) ? parsed : null;
}
