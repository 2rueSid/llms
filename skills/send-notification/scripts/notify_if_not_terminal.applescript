on run argv
	set summaryText to "Task complete"
	if (count of argv) > 0 then
		set summaryText to item 1 of argv
	end if

	tell application "System Events"
		set frontApp to name of first application process whose frontmost is true
	end tell

	if frontApp is "Ghostty" or frontApp is "Terminal" then
		return "skipped"
	end if

	display notification summaryText with title "Agent task complete"
	return "sent"
end run
