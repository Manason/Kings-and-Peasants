import webbrowser

for i in range(15):
	webbrowser.get('firefox').open_new_tab('localhost:8080')
