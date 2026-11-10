using EngMastery.Api.Data;
using EngMastery.Api.Dtos;
using EngMastery.Api.Models;
using EngMastery.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EngMastery.Api.Controllers;

[ApiController]
[Route("api/srs")]
public class SrsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly StudyLogService _logs;

    public SrsController(AppDbContext db, StudyLogService logs)
    {
        _db = db;
        _logs = logs;
    }

    /// <summary>Cards due for review, overdue first then highest mistake count.</summary>
    [HttpGet("due")]
    public async Task<ActionResult<List<CardDto>>> Due([FromQuery] int take = 50, [FromQuery] string? category = null)
    {
        var now = DateTime.UtcNow;
        var q = _db.VocabCards.Where(c => c.NextReviewDate <= now);
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(c => c.Category == category);
        var cards = await q
            .OrderBy(c => c.NextReviewDate)
            .ThenByDescending(c => c.MistakeCount)
            .Take(Math.Clamp(take, 1, 200))
            .ToListAsync();
        return cards.Select(DtoMapper.ToDto).ToList();
    }

    /// <summary>Cards frequently answered wrong (MistakeCount &gt; 0), hardest first — focused leech review.</summary>
    [HttpGet("leeches")]
    public async Task<ActionResult<List<CardDto>>> Leeches([FromQuery] int take = 50, [FromQuery] string? category = null)
    {
        var q = _db.VocabCards.Where(c => c.MistakeCount > 0);
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(c => c.Category == category);
        var cards = await q
            .OrderByDescending(c => c.MistakeCount)
            .ThenBy(c => c.NextReviewDate)
            .Take(Math.Clamp(take, 1, 200))
            .ToListAsync();
        return cards.Select(DtoMapper.ToDto).ToList();
    }

    /// <summary>Submit a review with quality q: 1=Again, 2=Hard, 3=Good, 4=Easy.</summary>
    [HttpPost("{id}/review")]
    public async Task<ActionResult<CardDto>> Review(int id, [FromBody] ReviewDto dto)
    {
        var card = await _db.VocabCards.FindAsync(id);
        if (card is null) return NotFound();
        try
        {
            Sm2Service.ApplyReview(card, dto.Quality, DateTime.UtcNow);
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return BadRequest(ex.Message);
        }
        await _db.SaveChangesAsync();
        await _logs.LogActivityAsync(cards: 1);
        return DtoMapper.ToDto(card);
    }
}

[ApiController]
[Route("api/cards")]
public class CardsController : ControllerBase
{
    private readonly AppDbContext _db;

    public CardsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<CardDto>>> List(
        [FromQuery] string? q = null, [FromQuery] string? category = null,
        [FromQuery] string? status = null, [FromQuery] int take = 200)
    {
        var query = _db.VocabCards.AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(c => c.Term.Contains(q) || c.MeaningVi.Contains(q) || c.DefinitionEn.Contains(q));
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(c => c.Category == category);
        if (Enum.TryParse<CardStatus>(status, true, out var st)) query = query.Where(c => c.Status == st);
        var cards = await query.OrderByDescending(c => c.MistakeCount).ThenBy(c => c.Term)
            .Take(Math.Clamp(take, 1, 5000)).ToListAsync();
        return cards.Select(DtoMapper.ToDto).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CardDto>> Get(int id)
    {
        var card = await _db.VocabCards.FindAsync(id);
        return card is null ? NotFound() : DtoMapper.ToDto(card);
    }

    [HttpPost]
    public async Task<ActionResult<CardDto>> Create([FromBody] UpsertCardDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Term)) return BadRequest("Term is required.");
        var card = new VocabCard { NextReviewDate = DateTime.UtcNow };
        DtoMapper.ApplyUpsert(card, dto);
        _db.VocabCards.Add(card);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = card.Id }, DtoMapper.ToDto(card));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CardDto>> Update(int id, [FromBody] UpsertCardDto dto)
    {
        var card = await _db.VocabCards.FindAsync(id);
        if (card is null) return NotFound();
        DtoMapper.ApplyUpsert(card, dto);
        await _db.SaveChangesAsync();
        return DtoMapper.ToDto(card);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var card = await _db.VocabCards.FindAsync(id);
        if (card is null) return NotFound();
        _db.VocabCards.Remove(card);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("categories")]
    public async Task<ActionResult<List<string>>> Categories() =>
        await _db.VocabCards.Select(c => c.Category).Distinct().OrderBy(x => x).ToListAsync();
}
