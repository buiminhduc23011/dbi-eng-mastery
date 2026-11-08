using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EngMastery.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppSettings",
                columns: table => new
                {
                    Key = table.Column<string>(type: "TEXT", nullable: false),
                    Value = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppSettings", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "SentenceDrills",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Category = table.Column<string>(type: "TEXT", nullable: false),
                    PromptVi = table.Column<string>(type: "TEXT", nullable: false),
                    TargetEn = table.Column<string>(type: "TEXT", nullable: false),
                    AlternativesEnJson = table.Column<string>(type: "TEXT", nullable: false),
                    KeywordsJson = table.Column<string>(type: "TEXT", nullable: false),
                    GrammarNote = table.Column<string>(type: "TEXT", nullable: false),
                    PracticeCount = table.Column<int>(type: "INTEGER", nullable: false),
                    LastScore = table.Column<int>(type: "INTEGER", nullable: false),
                    NextReviewDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SentenceDrills", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StudyLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    StudyDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    CardsReviewed = table.Column<int>(type: "INTEGER", nullable: false),
                    DrillsCompleted = table.Column<int>(type: "INTEGER", nullable: false),
                    AiCallsUsed = table.Column<int>(type: "INTEGER", nullable: false),
                    StudyDurationSeconds = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudyLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VocabCards",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Term = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Phonetic = table.Column<string>(type: "TEXT", nullable: false),
                    PartOfSpeech = table.Column<string>(type: "TEXT", nullable: false),
                    MeaningVi = table.Column<string>(type: "TEXT", nullable: false),
                    DefinitionEn = table.Column<string>(type: "TEXT", nullable: false),
                    ExampleSentence = table.Column<string>(type: "TEXT", nullable: false),
                    ClozeSentence = table.Column<string>(type: "TEXT", nullable: false),
                    ClozeHint = table.Column<string>(type: "TEXT", nullable: false),
                    Category = table.Column<string>(type: "TEXT", nullable: false),
                    Repetition = table.Column<int>(type: "INTEGER", nullable: false),
                    IntervalDays = table.Column<int>(type: "INTEGER", nullable: false),
                    EaseFactor = table.Column<double>(type: "REAL", nullable: false),
                    NextReviewDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    MistakeCount = table.Column<int>(type: "INTEGER", nullable: false),
                    LastReviewedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VocabCards", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SentenceDrills_Category",
                table: "SentenceDrills",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_SentenceDrills_NextReviewDate",
                table: "SentenceDrills",
                column: "NextReviewDate");

            migrationBuilder.CreateIndex(
                name: "IX_StudyLogs_StudyDate",
                table: "StudyLogs",
                column: "StudyDate",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VocabCards_Category",
                table: "VocabCards",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_VocabCards_NextReviewDate",
                table: "VocabCards",
                column: "NextReviewDate");

            migrationBuilder.CreateIndex(
                name: "IX_VocabCards_Status",
                table: "VocabCards",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppSettings");

            migrationBuilder.DropTable(
                name: "SentenceDrills");

            migrationBuilder.DropTable(
                name: "StudyLogs");

            migrationBuilder.DropTable(
                name: "VocabCards");
        }
    }
}
