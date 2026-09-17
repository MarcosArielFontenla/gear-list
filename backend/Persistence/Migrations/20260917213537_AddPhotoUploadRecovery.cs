using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LoadoutQueue.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPhotoUploadRecovery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "NotBefore",
                table: "PhotoDeletions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NotBefore",
                table: "PhotoDeletions");
        }
    }
}
