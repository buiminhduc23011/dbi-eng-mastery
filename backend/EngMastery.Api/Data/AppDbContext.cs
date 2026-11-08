using EngMastery.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EngMastery.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<VocabCard> VocabCards => Set<VocabCard>();
    public DbSet<SentenceDrill> SentenceDrills => Set<SentenceDrill>();
    public DbSet<StudyLog> StudyLogs => Set<StudyLog>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<VocabCard>(e =>
        {
            e.HasIndex(x => x.NextReviewDate);
            e.HasIndex(x => x.Category);
            e.HasIndex(x => x.Status);
            e.Property(x => x.Term).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<SentenceDrill>(e =>
        {
            e.HasIndex(x => x.NextReviewDate);
            e.HasIndex(x => x.Category);
        });

        modelBuilder.Entity<StudyLog>(e =>
        {
            e.HasIndex(x => x.StudyDate).IsUnique();
        });

        modelBuilder.Entity<AppSetting>(e =>
        {
            e.HasKey(x => x.Key);
        });
    }
}
