pipeline {
    agent any

    options {
        disableConcurrentBuilds()
    }

    triggers {
        githubPush()
    }

    environment {
        DEMO_PORT = '3100'
    }

    stages {
        stage('Build') {
            steps {
                bat 'node --version'
                dir('client') {
                    bat 'npm ci'
                    bat 'npm run build'
                }
                dir('server') {
                    bat 'npm ci'
                }
            }
        }

        stage('Unit Tests') {
            steps {
                dir('server') {
                    withCredentials([string(credentialsId: 'campaign-keeper-test-db', variable: 'DATABASE_URL')]) {
                        bat 'npm test -- --runInBand'
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Stop'
                    $deployRoot = Join-Path $env:LOCALAPPDATA ("CampaignKeeper-Jenkins-" + $env:DEMO_PORT)
                    $clientDir = Join-Path $deployRoot 'client'
                    $serverDir = Join-Path $deployRoot 'server'
                    $entry = [IO.Path]::Combine($serverDir, 'src', 'index.js')
                    $pidFile = Join-Path $deployRoot 'server.pid'
                    New-Item -ItemType Directory -Force -Path $clientDir, $serverDir, (Join-Path $serverDir 'data') | Out-Null

                    if (Test-Path $pidFile) {
                        $previousId = [int](Get-Content -LiteralPath $pidFile -Raw)
                        $previous = Get-CimInstance Win32_Process -Filter "ProcessId = $previousId"
                        if ($previous -and $previous.Name -eq 'node.exe' -and
                            $previous.CommandLine -and $previous.CommandLine.Contains($entry)) {
                            Stop-Process -Id $previousId
                            Wait-Process -Id $previousId -Timeout 10 -ErrorAction SilentlyContinue
                        }
                        Remove-Item -LiteralPath $pidFile
                    }

                    function Copy-BuildDirectory($source, $destination) {
                        if (!(Test-Path -LiteralPath $source -PathType Container)) {
                            throw "Missing deployment source: $source"
                        }
                        & robocopy $source $destination /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP
                        if ($LASTEXITCODE -ge 8) {
                            throw "Robocopy failed for $source (exit $LASTEXITCODE)"
                        }
                    }

                    Copy-BuildDirectory 'client/dist' (Join-Path $clientDir 'dist')
                    foreach ($folder in @('src', 'public', 'node_modules')) {
                        Copy-BuildDirectory "server/$folder" (Join-Path $serverDir $folder)
                    }
                    Copy-Item -LiteralPath 'server/package.json' -Destination $serverDir -Force

                    $env:PORT = $env:DEMO_PORT
                    $env:JENKINS_NODE_COOKIE = 'campaign-keeper-demo'
                    $node = (Get-Command node.exe).Source
                    $stdout = Join-Path $deployRoot 'server.log'
                    $stderr = Join-Path $deployRoot 'server-error.log'
                    $process = Start-Process -FilePath $node -ArgumentList ('"' + $entry + '"') -WorkingDirectory $serverDir -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
                    Set-Content -LiteralPath $pidFile -Value $process.Id

                    $url = "http://localhost:$env:PORT/"
                    for ($attempt = 0; $attempt -lt 20; $attempt++) {
                        $process.Refresh()
                        if ($process.HasExited) {
                            Get-Content -LiteralPath $stderr -Tail 20
                            throw "Campaign Keeper exited with code $($process.ExitCode)."
                        }
                        try {
                            Invoke-WebRequest -Uri ($url + 'api/health') -UseBasicParsing -TimeoutSec 2 | Out-Null
                            Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
                            Write-Host "Campaign Keeper deployed to $url"
                            exit 0
                        } catch {
                            Start-Sleep -Seconds 1
                        }
                    }
                    Stop-Process -Id $process.Id -ErrorAction SilentlyContinue
                    Get-Content -LiteralPath $stderr -Tail 20
                    throw "Campaign Keeper did not respond at $url."
                '''
            }
        }
    }
}
