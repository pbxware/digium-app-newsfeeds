var screen = require('screen');

var app = require('app');
app.init();

var DEF_ERROR_UPDATE_INT = 60000;
var DEF_SCREEN_UPDATE_INT = 30000;

var news_provider = "ria";

var news_data = [];

var news_show_index = 0;

var request_timer_id = null;

var refresh_timer_id = null;

var news_func_data = {
	retrieve:{
		"ria":{
			"name":"\"РИА Новости\"",
			"url":"http://ria.ru/export/rss2/index.xml",
			"update_int":300000
		},
		"rbc":{
			"name":"РБК",
			"url":"http://static.feed.rbc.ru/rbc/internal/rss.rbc.ru/rbc.ru/newsline.rss",
			"update_int":600000
		},
		"sport":{
			"name":"Спорт Mail.Ru",
			"url":"http://news.mail.ru/rss/sport/",
			"update_int":300000
		}
	},
	parse:{
		"ria":function(xml_string){
			var data = [], item, parser = new DOMParser();

			var document = parser.parseFromString(xml_string, 'application/xml');

			var nodes = document.getElementsByTagName('item'), node;

			for (var i = 0; i < nodes.length; i++) {
				node = nodes[i];

				item = {
					"text":node.getElementsByTagName('title')[0].childNodes[0].nodeValue,
					"date":node.getElementsByTagName('pubDate')[0].childNodes[0].nodeValue
				};

				data.push(item);
			}

			return data;
		},
		"rbc":function(xml_string){
			var data = [], item, parser = new DOMParser();

			var document = parser.parseFromString(xml_string, 'application/xml');

			var nodes = document.getElementsByTagName('item'), node;

			for (var i = 0; i < nodes.length; i++) {
				node = nodes[i];

				item = {
					"text":node.getElementsByTagName('title')[0].childNodes[0].nodeValue,
					"date":node.getElementsByTagName('pubDate')[0].childNodes[0].nodeValue
				};

				data.push(item);
			}

			return data;
		},
		"sport":function(xml_string){
			var data = [], item, parser = new DOMParser();

			var document = parser.parseFromString(xml_string, 'application/xml');

			var nodes = document.getElementsByTagName('item'), node;

			for (var i = 0; i < nodes.length; i++) {
				node = nodes[i];

				item = {
					"text":node.getElementsByTagName('title')[0].childNodes[0].nodeValue,
					"date":node.getElementsByTagName('pubDate')[0].childNodes[0].nodeValue
				};

				data.push(item);
			}

			return data;
		}
	}
};

function padZeros(num, pad_count) {
	var s_num = num.toString();
	var s_off = s_num.length - 1;
	var result = [];
	var i, j;

	for (i = 0; i < pad_count; i++) {
		j = s_off - i;
		if ('undefined' !== typeof s_num[j])
			result.push(s_num[j]);
		else
			result.push("0");
	}

	return result.reverse().join("");
}

function doGetRequest(url)
{
	var request = new NetRequest();

	request.open('GET', url, true);

	request.onreadystatechange = function() {
		if (4 == request.readyState) {
			if (200 == request.status)
				getNewsDataCb(request.responseText);
			else
				throw new Error('Invalid request status (' + request.status + ')');
		}
	};

	request.send();
}

function idleRefresh()
{
	var idx;

	if (news_show_index >= news_data.length)
		idx = news_show_index = 0;
	else
		idx = news_show_index++;

	if (news_data.length && 'undefined' !== typeof news_data[idx]) {
		var item = news_data[idx];
		var date_obj = new Date(item.date);

		var date_str = ' ' + padZeros(date_obj.getDate(), 2) + '.' +
			padZeros(date_obj.getMonth() + 1, 2) + ', ' +
			padZeros(date_obj.getHours(), 2) + ':' +
			padZeros(date_obj.getMinutes(), 2);

		digium.app.idleWindow[0].label = item.text + '\n\n- ' +
			news_func_data.retrieve[news_provider].name + date_str;
	}
	else
		digium.app.idleWindow[0].label = 'Загрузка новостей...';

	clearTimeout(refresh_timer_id);

	refresh_timer_id = setTimeout(idleRefresh, DEF_SCREEN_UPDATE_INT);
}

function getNewsDataCb(response_text)
{
	try {
		news_data = news_func_data.parse[news_provider](response_text);

		news_show_index = 0;

		idleRefresh();
	}
	catch (e) {
		clearTimeout(request_timer_id);

		request_timer_id = setTimeout(updateNewsData, DEF_ERROR_UPDATE_INT);
	}
}

function updateNewsData()
{
	clearTimeout(request_timer_id);

	try {
		var provider_data = news_func_data.retrieve[news_provider];

		doGetRequest(provider_data.url);

		request_timer_id = setTimeout(updateNewsData, provider_data.update_int);
	}
	catch (e) {
		request_timer_id = setTimeout(updateNewsData, DEF_ERROR_UPDATE_INT);
	}
}

function idleInitialize()
{
	digium.app.idleWindow.hideBottomBar = true;

	var message = new Text(0, 0, digium.app.idleWindow.w, digium.app.idleWindow.h);

	message.align(Widget.WRAP | Widget.LEFT | Widget.TOP);

	digium.app.idleWindow.add(message);
}

function showAppWindow()
{
	window.clear();

	window.add(screen.setTitleText({'title':'Новости'}));

	try {
		window.add(new Text(0, Text.LINE_HEIGHT, window.w, Text.LINE_HEIGHT, 'Выберите источник новостей:'));

		var menuObj = new List(0, 2 * Text.LINE_HEIGHT, window.w, window.h);

		menuObj.setProp('cols', 2).setProp('rows', 3);

		menuObj.set(0, 0, '1.');
		menuObj.set(0, 1, 'РИА Новости');
		menuObj.set(1, 0, '2.');
		menuObj.set(1, 1, 'РБК');
		menuObj.set(2, 0, '3.');
		menuObj.set(2, 1, 'Спорт Mail.Ru');

		menuObj.setColumnWidths(15, 0);
		menuObj.select(0);

		menuObj.onFocus = function() {return true; };

		var selected = function() {
			news_data = [];

			news_provider = ["ria", "rbc", "sport"][menuObj.selected];

			digium.app.exitAfterBackground = false;

			digium.background();

			updateNewsData();
		};

		menuObj.onkey1 = function(){ menuObj.select(0); selected(); };
		menuObj.onkey2 = function(){ menuObj.select(1); selected(); };
		menuObj.onkey3 = function(){ menuObj.select(2); selected(); };

		menuObj.onkeyselect = selected;

		menuObj.setSoftkey(1, 'OK', selected);
		menuObj.setSoftkey(4, 'Выход', closeApp);

		window.add(menuObj);

		menuObj.takeFocus();
	}
	catch(e) {
		window.clear();

		window.add(screen.setTitleText({'title':'Ошибка'}));

		window.add(new Text(0, 20, Text.LINE_HEIGHT, Text.LINE_HEIGHT, e.message));
	}
}

function closeApp()
{
	digium.app.exitAfterBackground = true;
	digium.background();
}

function initialize()
{
	idleInitialize();

	digium.event.observe({
		'eventName'	: 'digium.app.idle_screen_show',
		'callback'	: function () {
			if (digium.app.idleWindowShown) idleRefresh();
		}
	});

	digium.event.observe({
		'eventName'	: 'digium.app.foreground',
		'callback'	: function () {
			showAppWindow();
		}
	});
}

initialize();