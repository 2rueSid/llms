on run argv
	set summaryText to "Task complete"
	set skipFrontmostCheck to false
	set summaryParts to {}

	repeat with argValue in argv
		set argText to argValue as text
		if argText is "--skip-frontmost-check" then
			set skipFrontmostCheck to true
		else
			set end of summaryParts to argText
		end if
	end repeat

	if (count of summaryParts) > 0 then
		set AppleScript's text item delimiters to " "
		set summaryText to summaryParts as text
		set AppleScript's text item delimiters to ""
	end if

	if skipFrontmostCheck is false then
		tell application "System Events"
			set frontApp to name of first application process whose frontmost is true
		end tell

		if frontApp is "Ghostty" or frontApp is "Terminal" then
			return "skipped"
		end if
	end if

	display notification summaryText with title "Agent task complete"
	return "sent"
end run
