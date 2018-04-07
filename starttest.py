import webbrowser

for i in range(10):
	webbrowser.get('firefox').open_new_tab('localhost:8080')
