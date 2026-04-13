namespace Users.Application.Abstractions;

public interface IRefreshTokenGenerator
{
    string Generate();
}