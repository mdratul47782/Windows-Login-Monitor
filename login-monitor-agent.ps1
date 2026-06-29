# ============================================================
# Factory PC Login Monitor Agent
# Purpose: Monitor Windows Event Logs and send a report to the
# Next.js API if a user enters the wrong password 3 times.
# ============================================================

# ---- Configuration (modify as needed) ----
$ApiUrl       = "http://192.169.10.220:3000/api/login-alert"   # Your Next.js server URL
$ApiKey       = "123456"                                       # Must match the server API key
$FailLimit    = 3                                              # Number of failed attempts before alert
$PollSeconds  = 5                                              # Check interval in seconds
$PCName       = $env:COMPUTERNAME

# Store failed login counts per user in memory
$FailCounts = @{}

# Start monitoring from the current time and ignore old events
$StartTime = Get-Date

Write-Host "Login monitor agent started on PC: $PCName"

while ($true) {
    try {
        # Event ID 4625 = Failed logon (Security log)
        $events = Get-WinEvent -FilterHashtable @{
            LogName   = 'Security'
            Id        = 4625
            StartTime = $StartTime
        } -ErrorAction SilentlyContinue

        if ($events) {
            foreach ($event in $events) {
                # Extract the username from the XML event data
                $xml = [xml]$event.ToXml()
                $targetUser = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'TargetUserName' }).'#text'

                if ($targetUser -and $targetUser -ne '-' -and $targetUser -notlike '*$') {
                    if (-not $FailCounts.ContainsKey($targetUser)) {
                        $FailCounts[$targetUser] = 0
                    }

                    $FailCounts[$targetUser]++

                    Write-Host "[$($event.TimeCreated)] $targetUser - Failed password count: $($FailCounts[$targetUser])"

                    if ($FailCounts[$targetUser] -ge $FailLimit) {

                        # Send alert data to the API
                        $body = @{
                            pcName    = $PCName
                            userName  = $targetUser
                            failCount = $FailCounts[$targetUser]
                            timestamp = $event.TimeCreated.ToString("o")
                        } | ConvertTo-Json

                        try {
                            Invoke-RestMethod -Uri $ApiUrl -Method Post `
                                -Headers @{ "x-api-key" = $ApiKey } `
                                -ContentType "application/json" `
                                -Body $body | Out-Null

                            Write-Host "  -> Alert sent to the server."
                        }
                        catch {
                            Write-Host "  -> Failed to send alert: $($_.Exception.Message)"
                        }

                        # Reset the counter to avoid repeated alerts
                        $FailCounts[$targetUser] = 0
                    }
                }
            }

            # Update StartTime so the same events are not processed again
            $StartTime = Get-Date
        }
    }
    catch {
        Write-Host "Error: $($_.Exception.Message)"
    }

    Start-Sleep -Seconds $PollSeconds
}