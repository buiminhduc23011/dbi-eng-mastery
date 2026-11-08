using EngMastery.Api.Models;

namespace EngMastery.Api.Services;

/// <summary>
/// Exact SuperMemo-2 (SM-2) implementation.
/// Button rating q: 1 = Again/Fail, 2 = Hard, 3 = Good, 4 = Easy.
/// Mapped to classic SM-2 quality scale (0-5): 1-&gt;0, 2-&gt;3, 3-&gt;4, 4-&gt;5.
/// </summary>
public static class Sm2Service
{
    public static int ToSm2Quality(int buttonRating) => buttonRating switch
    {
        1 => 0, // Again / Fail
        2 => 3, // Hard
        3 => 4, // Good
        4 => 5, // Easy
        _ => throw new ArgumentOutOfRangeException(nameof(buttonRating), "Rating must be 1-4."),
    };

    public static void ApplyReview(VocabCard card, int buttonRating, DateTime utcNow)
    {
        if (buttonRating is < 1 or > 4)
            throw new ArgumentOutOfRangeException(nameof(buttonRating), "Rating must be 1-4.");

        int q = ToSm2Quality(buttonRating);

        if (q < 3)
        {
            // Failed recall: increment leech counter, reset progress, review tomorrow.
            card.MistakeCount++;
            card.Repetition = 0;
            card.IntervalDays = 1;
        }
        else
        {
            // Update ease factor: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02)), floor 1.3
            double ef = card.EaseFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
            card.EaseFactor = Math.Max(1.3, Math.Round(ef, 2));

            card.Repetition++;
            card.IntervalDays = card.Repetition switch
            {
                1 => 1,
                2 => 6,
                _ => (int)Math.Round(card.IntervalDays <= 0 ? 6 * card.EaseFactor : card.IntervalDays * card.EaseFactor),
            };
            if (card.IntervalDays < 1) card.IntervalDays = 1;
        }

        card.LastReviewedAt = utcNow;
        card.NextReviewDate = utcNow.AddDays(card.IntervalDays);
        card.Status = DeriveStatus(card);
    }

    public static CardStatus DeriveStatus(VocabCard card)
    {
        if (card.Repetition >= 6 && card.IntervalDays >= 21) return CardStatus.Mastered;
        if (card.Repetition >= 3) return CardStatus.Review;
        if (card.Repetition >= 1 || card.LastReviewedAt.HasValue) return CardStatus.Learning;
        return CardStatus.New;
    }
}
