#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Agent-Matrix: Notification Hook — Windows 11 Balloon Tip
# Claude Code kullanicidan input/onay beklediginde tetiklenir.
# ─────────────────────────────────────────────────────────────

powershell.exe -WindowStyle Hidden -Command "
  Add-Type -AssemblyName System.Windows.Forms
  \$n = New-Object System.Windows.Forms.NotifyIcon
  \$n.Icon = [System.Drawing.SystemIcons]::Information
  \$n.BalloonTipTitle = 'Agent-Matrix Command Center'
  \$n.BalloonTipText  = 'Claude Code senin onayini bekliyor! Terminale don.'
  \$n.Visible = \$true
  \$n.ShowBalloonTip(5000)
  Start-Sleep -Seconds 6
  \$n.Dispose()
" 2>/dev/null || echo "⚠️  Agent-Matrix: Claude Code onay veya yardim bekliyor!"

exit 0
