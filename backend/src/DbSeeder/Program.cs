// DbSeeder, runs one SQL script from database/ against the configured database.
//
//   dotnet run --project backend/src/DbSeeder -- database/07_submission_kind.sql
//
// THE CONNECTION STRING IS NOT IN THIS FILE, and must never be. It used to be a
// literal Aiven connection string with a real service-user password, and GitHub
// push protection correctly refused the push that would have published it. A
// password that reaches source control is a leaked password, so if you are here
// after seeing that, rotate the credential in the Aiven console first and only
// then set the replacement through the environment as below.
//
// The variables below are the same ones the API already uses, in the same order
// of preference, so one set of secrets works for both. Locally, set them in the
// shell for the session or with `dotnet user-secrets`; on a host, set them in the
// platform's secret store (Render, for this project).
//
//   DB_CONNECTION_STRING   the whole string, if you have one
//   DB_HOST                e.g. mysql-xxxx.aivencloud.com
//   DB_PORT                defaults to 3306
//   DB_NAME
//   DB_USER
//   DB_PASSWORD
//   DB_SSL_MODE            Preferred (default) or Required
//
// DB_CONNECTION_STRING wins as a single value, and DB_* is assembled from the
// discrete variables, because a password containing a semicolon or an at-sign
// needs no escaping when it is a value in its own right. That is also why
// ServiceCollectionExtensions.ResolveConnectionString reads them in this order.
using MySqlConnector;

class Program
{
    static int Main(string[] args)
    {
        // The script to run is an argument rather than a literal. It used to be
        // an absolute path under one developer's home directory, so the seeder
        // could only ever run on that one machine.
        if (args.Length < 1)
        {
            Console.Error.WriteLine("Usage: dotnet run --project backend/src/DbSeeder -- <script.sql>");
            Console.Error.WriteLine("Example: dotnet run --project backend/src/DbSeeder -- database/07_submission_kind.sql");
            return 1;
        }

        string file = args[0];
        if (!File.Exists(file))
        {
            Console.Error.WriteLine($"Script not found: {file}");
            return 1;
        }

        string connectionString;
        try
        {
            connectionString = ResolveConnectionString();
        }
        catch (InvalidOperationException ex)
        {
            // Printed as-is: it lists the variable names, and nothing in this
            // method's output ever includes the password.
            Console.Error.WriteLine(ex.Message);
            return 1;
        }

        // Nothing below prints the connection string, on purpose. MySqlConnector
        // error text carries the host, not the password, but a thrown exception
        // ends up in CI logs, so the rule is simply never to echo it.
        using var connection = new MySqlConnection(connectionString);
        try
        {
            connection.Open();
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Could not connect: {ex.Message}");
            return 1;
        }

        string script = File.ReadAllText(file);
        Console.WriteLine($"Executing {Path.GetFileName(file)}...");

        using var command = new MySqlCommand(script, connection);
        try
        {
            command.ExecuteNonQuery();
            Console.WriteLine($"Success: {Path.GetFileName(file)}");
            return 0;
        }
        catch (Exception ex)
        {
            // A non-zero exit code, so a caller running several scripts in a row
            // stops at the one that failed instead of carrying on and reporting
            // success at the end.
            Console.Error.WriteLine($"Failed on {Path.GetFileName(file)}: {ex.Message}");
            return 1;
        }
    }

    /// <summary>
    /// The connection string, from the environment. See the file header for the
    /// variables and why they are read in this order.
    /// </summary>
    static string ResolveConnectionString()
    {
        string? direct = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING");
        if (!string.IsNullOrWhiteSpace(direct)) return direct;

        string? host = Environment.GetEnvironmentVariable("DB_HOST");
        string? name = Environment.GetEnvironmentVariable("DB_NAME");
        string? user = Environment.GetEnvironmentVariable("DB_USER");
        string? password = Environment.GetEnvironmentVariable("DB_PASSWORD");

        if (new[] { host, name, user, password }.Any(string.IsNullOrWhiteSpace))
        {
            throw new InvalidOperationException(
                "No database configured. Set DB_CONNECTION_STRING, or all four of " +
                "DB_HOST, DB_NAME, DB_USER and DB_PASSWORD. Do not put the password in " +
                "this file: GitHub push protection blocks the push, and a password in " +
                "source control has to be treated as leaked and rotated."
            );
        }

        string? port = Environment.GetEnvironmentVariable("DB_PORT");
        // Preferred rather than Required because that is MySqlConnector's default
        // and matches what the API builds, so the two cannot disagree. A managed
        // host that terminates TLS only, such as Aiven, needs DB_SSL_MODE=Required.
        string? sslMode = Environment.GetEnvironmentVariable("DB_SSL_MODE");

        return $"Server={host};Port={port ?? "3306"};Database={name};User={user};Password={password};" +
               $"SslMode={sslMode ?? "Preferred"};AllowUserVariables=true;";
    }
}
