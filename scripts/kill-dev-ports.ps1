# Kill processes running on ports 5173, 3000, and 3001

$ports = @(5173, 3000, 3001)

foreach ($port in $ports) {
    $pids = netstat -ano | findstr ":$port" | ForEach-Object {
        ($_ -split '\s+')[-1]
    } | Select-Object -Unique

    foreach ($pid in $pids) {
        if ($pid -match '^\d+$') {
            try {
                Write-Host "Killing PID $pid on port $port..."
                taskkill /PID $pid /F
            } catch {
                Write-Host "Could not kill PID $pid (might already be gone)."
            }
        }
    }
}
