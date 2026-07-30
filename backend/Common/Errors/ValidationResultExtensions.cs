using FluentValidation.Results;

namespace LoadoutQueue.Api.Common.Errors;

public static class ValidationResultExtensions
{
    public static Dictionary<string, string[]> ToProblemDetailsErrors(
        this ValidationResult validation)
    {
        return validation.Errors
            .GroupBy(error => error.PropertyName)
            .ToDictionary(
                group => group.Key,
                group => group
                    .Select(error => error.ErrorMessage)
                    .Distinct()
                    .ToArray());
    }
}
