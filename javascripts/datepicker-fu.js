var UI = {};

Element.addMethods({
  center: function( container, element ) {
    element = $(element);
    container = $(container);
    var cBorders = container.borderDimensions(), eBorders = element.borderDimensions();
    var height = container.getHeight()-(cBorders.top + cBorders.bottom);
    var width = container.getWidth()-(cBorders.left + cBorders.right);
    
    var setX = ((width-element.getWidth()-(eBorders.left + eBorders.right))/2);
    var setY = ((height-element.getHeight()-(eBorders.top + eBorders.bottom))/2);

    setX = (setX < 0) ? 0 : setX;
    setY = (setY < 0) ? 0 : setY;
    container.relativize();
    
    return element.setStyle({ top: setY + 'px', left: setX + 'px' });
  },
  
  borderDimensions: function( element ) {
    return $w('top bottom left right').inject({}, function(dims, key) {
      dims[key] = parseFloat(element.getStyle('border-' + key + '-width') || 0);
      return dims;
    });
  }
});

UI.Calendar = Class.create({
  options: {
    theme        : 'blue',
    popup        : false,
    format       : '%m/%d/%Y',
    startWeekday : 0,
    footer       : true,
    startDate    : new Date()
  },

  initialize: function(element) {
    this.options = Object.extend(this.options, arguments[1] || {});

    this.selectedDate = this.convertDate(this.options.selectedDate);

    if (this.options.popup)
      this.initPopup(element);
    else
      this.element = $(element);
    
    this.element.identify();
    
    this.container = new Element('div').addClassName('ui_calendar_container');
    this.container.setStyle({ position: 'relative' });
    this.element.addClassName(this.options.theme).insert({ top: this.container });
                  
    this.initDate(this.options.startDate);
    this.buildTable();
    this.buildSelector();
    this.update(this.selectedDate || this.date);
  },
  
  fire: function(eventName, memo) {
    memo = memo || { };
    memo.calendar = this;    
    return this.element.fire('calendar:' + eventName, memo);
  },

  observe: function(eventName, handler) { 
    this.element.observe('calendar:' + eventName, handler.bind(this));
    return this;
  },

  stopObserving: function(eventName, handler) {
	  this.element.stopObserving('calendar:' + eventName, handler);
	  return this;
  },

  generateId: function(name) {
    return this.element.id + name;
  },
  
  initDate: function(date) {
    this.date = this.convertDate(date);
  },

  convertDate: function(date) {
    if (!date) return null;
    
    return Object.isString(date) ? new Date(date) : date;
  },
  
  initPopup: function(element) {
    this.element = new Element('div')
    .setStyle({
      position: 'absolute'
    })
    .hide();
    document.body.insert(this.element);
    
    this.button = $(element);
    
    $(this.button)
      .observe('click', function(event) {
        this.show();
      }.bind(this));
      
    this.observe('cancel', function(event) {
      this.hide();
    }.bind(this));
  },

  update: function(newDate) {
    this.updateDaysRow();
    this.date = new Date(newDate);
    var today = new Date();
    this.headerSpan.innerHTML = UI.Calendar.Options.MONTHS[this.date.getMonth()] + ' ' + this.date.getFullYear();

    var days = $R(this.startDay(this.date), this.lastDay(this.date));
    if (days.size() < 42) {
      days = $R(this.startDay(this.date), this.lastDay(this.date).addDays(42 - days.size()));
    }
    days = $A(days);

    var day, cell, classNames, monthDate, index, l;
    for (index = 0, l = days.length; index < l; ++index) {
      day = days[index];
      cell = this.cells[index];
      classNames = [];
      cell.date = day;

      monthDate = day.getDate();
      
      if (day.getMonth() != this.date.getMonth()) {
        classNames.push('non_current');
        cell.innerHTML = monthDate;
      } else {
        cell.innerHTML = '<a href="#">' + monthDate + '</a>';

        if (this.selectedDate && this.selectedDate.equalsDate(day)) {
          classNames.push('selected');
        }
          
      }
      if (today.equalsDate(day)) classNames.push('today');      
      if (cell.hasClassName('weekend')) classNames.push('weekend');
      if (cell.hasClassName('first')) classNames.push('first');
      if (cell.hasClassName('last')) classNames.push('last');

      cell.className = classNames.join(' ');
    }
  },
  
  updateDaysRow: function() {
    var dayNames = this.dayNames();
    this.daysRow.update('');
    $R(0, 6).each(function(n){
      this.daysRow.insert({ 
        bottom: new Element('th', {'class': 'dayname'}).update(dayNames[n].truncate(2,''))
      });
    }.bind(this));
  },

  onCellClick: function(event) {  
    event.stop();
    var element = event.element();
    if (element.tagName == 'A') element = element.up('td');
    if (element.hasClassName('non_current')) return;
    var day = element.date;
    this.selectedDay = day;
    
    $w('selected selected_next selected_prev').each(function(e){ 
      this.table.select('.' +  e).invoke('removeClassName', e); 
    }.bind(this));
    
    element.addClassName('selected');
    var next = element.next(), prev = element.previous();
    if (next) next.addClassName('selected_next');
    if (prev) prev.addClassName('selected_prev');

    this.fire('click', { 
      date: day, 
      formattedDate: day.strftime(this.options.format) 
    });
  },

  onMonthClick: function(event) {
    event.stop();
    this.selector.setStyle({ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      'float': 'left', 
      zIndex: 3 
    });
    this._showSelector();
  },

  _showMask: function() {
    // Stupid hack because IE browsers do not support css width/height: 100% sometimes
    if (Prototype.Browser.IE) {
      var borderDimensions = this.container.borderDimensions();
      if (!this.containerWidth) {
        this.containerWidth = this.container.getWidth()-(borderDimensions.left + borderDimensions.right);
      }      
      if (!this.containerHeight) {
        this.containerHeight = this.container.getHeight()-(borderDimensions.top + borderDimensions.bottom);
      }
      this.mask.setStyle({
        width  : this.containerWidth + 'px',
        height : this.containerHeight + 'px'
      });
    }
    this.mask.show();
  },
  
  _hideSelector: function() {
    this.mask.hide();
    this.selector.hide();
  },
  
  _showSelector: function() {
    this.container.center(this.selector);
    this._showMask();
    this.selector.show();
  },

  buildTable: function() {
    this.table = new Element('table').addClassName('ui_calendar');
    this.table.setStyle({ position: 'relative' });
    
    this.buildHeader(this.date);

    var tbody = new Element('tbody');

    $R(1, 42).inGroupsOf(7).each(function(week, index) {
      var row = new Element('tr');
      week.each(function(day, i){
        var cell = new Element('td');
        if (i == 0 || i == 6) cell.addClassName('weekend');
        if (i == 0) cell.addClassName('first');
        if (i == 6) cell.addClassName('last');
        row.insert({ bottom: cell});
      });
      tbody.insert({ bottom: row });
    }.bind(this));

    this.cells = tbody.select('td');
    this.cells.invoke('observe', 'click', this.onCellClick.bind(this));
    this.table.insert({ bottom: tbody });
    this.container.insert({ top: this.table });
  },

  buildSelector: function() {
    this.selector = new Element('div').addClassName('selector').hide();
    
    this.mask = new Element('div').hide().addClassName('ui_calendar_mask').setOpacity(0.3);
    
    this.container.insert({ bottom: this.selector })
                  .insert({ bottom: this.mask });
    
    this.selector.insert({ 
      top: new Element('label', {
        'for': this.generateId('_select')
      }).update(UI.Calendar.Options.LABEL_MONTH)
    });
    
    var select = new Element('select');
    for (var i = 0; i < 12; i++) {
      select.insert({ bottom: new Element('option', { value: i }).update(UI.Calendar.Options.MONTHS[i]) });
    }
    
    this.selector.insert({ 
      bottom: select 
    }).insert({ 
      bottom: new Element('label', {
        'for' :  this.generateId('_input')
      }).update(UI.Calendar.Options.LABEL_YEAR)
    });

    var input = new Element('input', { 
      type: 'text', 
      size: 4, maxLength: 4, 
      value: this.date.getFullYear() 
    });
    
    this.selector.insert({ bottom: input });
    
    var createButton = function(name, onClick) {
      return new Element('span')
        .addClassName('ui_calendar_button')
        .insert({ top: 
          new Element('button', { type: 'button' 
        })
        .update(name)
        .observe('click', onClick.bind(this)) });
    };
    var btnCn = createButton('Cancel', function(e) {
       this._hideSelector();
     }.bind(this));
       
    var btnOk = createButton('OK', function(e) {
      this._hideSelector();
      this.update(new Date(input.value, select.value, 1));
    }.bind(this));
    
    this.selector.insert(
      new Element('div', { 
        textAlign : 'center', 
        width     : '100%',
        className : 'ui_calendar_button_div'
      })
      .insert(btnCn)
      .insert(btnOk)
    );
  },

  buildHeader: function(date) {
    var header = new Element('thead');
    this.daysRow = new Element('tr', { 
      id: this.generateId('_days_row') 
    });

    var initLink = function(link, type, self) {
      link
        .observe('click', function(e) {
          e.stop();
          self[type].call(self);
        })
        .observe('mousedown', function(e) {
          var p = new PeriodicalExecuter(function(pe){ 
            self[type].call(self); 
          }, .25);
          document.observe('mouseup', function(e){ p.stop(); });
        });
    };

    $w('previousMonth previousYear nextMonth nextYear').each(function(type) {
      
      this[type + 'Link'] = new Element('a', { className: type }).update('<span>' + type + '</span>');
      initLink(this[type + 'Link'], type, this);
      
    }.bind(this));

    this.headerSpan = new Element('a', {
      className: 'month',
      href: '#'
    })
    .update(UI.Calendar.Options.MONTHS[date.getMonth()] + ' ' + date.getFullYear())
    .observe('click', this.onMonthClick.bind(this));
      
    this.updateDaysRow();

    header
      .insert({ 
        bottom: new Element('tr', { className: 'ui_calendar_controls' })
          .insert(new Element('th').insert(this.previousYearLink))
          .insert(new Element('th').insert(this.previousMonthLink))
          .insert(new Element('th', { colspan: 3, className: 'month' }).update(this.headerSpan)) 
          .insert(new Element('th').insert(this.nextMonthLink))
          .insert(new Element('th').insert(this.nextYearLink))
      })
      .insert({ bottom: this.daysRow });

    this.table.insert({ top: header });
    
    if (this.options.footer) {
      var btnTdy = new Element('input', { type: 'button', className: 'ui_calendar_button', value: 'Today' })
        .observe('click', function(event) {
          this.setSelectedDate(new Date());
          
          this.fire('click', { 
            date: this.selectedDate, 
            formattedDate: this.selectedDate.strftime(this.options.format) 
          });
        }.bind(this));
        
        
      var btnCnl = new Element('input', { type: 'button', className: 'ui_calendar_button', value: 'Cancel' })
        .observe('click', function(event) {
          this.fire('cancel');
        }.bind(this));
      
      var footerCell = new Element('td', { colspan: 7 })
        .insert(btnTdy);
      
      if (this.options.popup)
        footerCell.insert(btnCnl);
      
      this.table.insert(
        new Element('tfoot').insert(new Element('tr').insert(footerCell))
      );
    }
  },

  nextMonth: function() {
    this.date.setMonth(this.date.getMonth() + 1);
    this.update(this.date);
  },
  
  nextYear: function() {
    this.date.setYear(this.date.getFullYear() + 1);
    this.update(this.date);
  },

  previousMonth: function() {
    this.date.setMonth(this.date.getMonth() - 1);
    this.update(this.date);
  },
  
  previousYear: function() {
    this.date.setYear(this.date.getFullYear() - 1);
    this.update(this.date);
  },

  startDay: function(date) {
    var startDate = date.firstOfMonth();
  	startDate.setDate(-(startDate.getDay() % 7));
  	startDate.setDate(startDate.getDate() + 1 + parseInt(this.options.startWeekday));
    return startDate;
  },

  lastDay: function(date) {
    var endDate = date.endOfMonth();
  	endDate.setDate(endDate.getDate() + 6 - (endDate.getDay() % 7));
    return endDate;
  },
  
  dayNames: function() {
    var days = UI.Calendar.Options.WEEKDAYS.slice(this.options.startWeekday);
    for (var i = 0; i < this.options.startWeekday; i++) days.push(UI.Calendar.Options.WEEKDAYS[i]);
    return days;
  },
  
  setSelectedDate: function(date) {
    this.selectedDate = this.convertDate(date);
    
    if (this.selectedDate)
      this.update(this.selectedDate);
  },
  
  setStartWeekday: function(start) {
    this.options.startWeekday = start;
    this.update(this.date);
  },
  
  hide: function() {
    this.element.hide();
  },
  
  show: function() {
    var offset = this.button.cumulativeOffset();

    var dimensions = this.element.getDimensions();

    if ((this.button.cumulativeOffset()[1] + dimensions.height) > 
        (document.viewport.getHeight() + document.viewport.getScrollOffsets()[1]) - 50) {
          
      this.element.setStyle({
        top: (offset[1] - dimensions.height - 4) + 'px',
        left: offset[0] + 'px'
      })
      .show();
    } else {
      this.element.setStyle({
        top: (offset[1] + this.button.getHeight() + 2) + 'px',
        left: offset[0] + 'px'
      })
      .show();
    }
  }
});

Object.extend(Date.prototype, {

  addDays: function(days) {
    return new Date(this.getFullYear(), this.getMonth(), this.getDate() + days, this.getHours(), this.getMinutes(), this.getSeconds(), this.getMilliseconds());
  },

  succ: function() {
    return this.addDays(1);
  },

  firstOfMonth: function() {
    return new Date(this.getFullYear(), this.getMonth(), 1);
  },

  endOfMonth: function() {
    return new Date(this.getFullYear(), this.getMonth() + 1, 0);
  },

  getDayOfYear: function() {
    return Math.ceil((this - new Date(this.getFullYear(), 0, 1)) / 86400000);
  },

  strftime: function(grammar) {
    var parts = {};
	var i18n = Object.extend(Object.clone(Date.default_i18n),UI.Calendar.Options);
    var lambda = function(date, part) {
      switch (part) {
	  	// date
        case 'a': return i18n.WEEKDAYS_MEDIUM[date.getDay()];
        case 'A': return i18n.WEEKDAYS[date.getDay()];
        case 'b': 
		case 'h': return i18n.MONTHS_SHORT[date.getMonth()];
        case 'B': return i18n.MONTHS[date.getMonth()];
		case 'C': return Math.floor(date.getFullYear() / 100);
        case 'd': return date.getDate().toPaddedString(2);
		case 'e': return date.getDate();
        case 'j': return date.getDayOfYear();
        case 'm': return (date.getMonth()+1).toPaddedString(2);
		case 'u': return date.getDay() || 7;
        case 'w': return date.getDay();
        case 'y': return date.getFullYear().toString().substring(2);
        case 'Y': return date.getFullYear();
		
		// time
		case 'H': return date.getHours().toPaddedString(2);
		case 'I': return (date.getHours() % 12).toPaddedString(2);
		case 'M': return date.getMinutes().toPaddedString(2);
		case 'p': return date.getHours() < 12 ? 'am' : 'pm';
		case 'S': return date.getSeconds().toPaddedString(2);

		// static
		case 'n': return '\n';
		case 't': return '\t';
		
		// combined
		case 'D': return date.strftime('%m/%d/%y'); 
		case 'r': return date.strftime('%I:%M:%S %p'); // time in a.m. and p.m. notation
		case 'R': return date.strftime('%H:%M:%S'); // time in 24 hour notation
		case 'T': return date.strftime('%H:%M:%S'); // current time, equal to %H:%M:%S

		// locale
		case 'c': return date.strftime(i18n.FORMAT_DATETIME);
		case 'x': return date.strftime(i18n.FORMAT_DATE);
		case 'X': return date.strftime(i18n.FORMAT_TIME);
      }
    };
    grammar.scan(/\w+/, function(e){
      var part = e.first();
      parts[part] = lambda(this, part);
    }.bind(this));
    return grammar.interpolate(parts, Date.STRFT_GRAMMER);
  },

  equalsDate: function(date) {
    return (this.getMonth() == date.getMonth() && this.getDate() == date.getDate() && this.getFullYear() == date.getFullYear());
  }
});

Object.extend(Date, {
  STRFT_GRAMMER : /(^|.|\r|\n)(\%(\w+))/,
  
  default_i18n: {
  	MONTHS_SHORT: $w('Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'),
  	MONTHS: $w('January February March April May June July August September October November December'),
  	WEEKDAYS_MEDIUM: $w('Sun Mon Tue Wed Thu Fri Sat'),
  	WEEKDAYS: $w('Sunday Monday Tuesday Wednesday Thursday Friday Saturday'),
  	FORMAT_DATE: '%m/%d/%Y',
  	FORMAT_TIME: '%H:%M:%S',
  	FORMAT_DATETIME: '%x %X'
  },

  parseString: function(dateString, format) {
    var date = new Date();
	var i18n = Object.extend(Object.clone(Date.default_i18n),UI.Calendar.Options);

	format=format.replace('%D','%m/%d/%y');
	format=format.replace('%T','%H:%M:%S').replace('%r','%I:%M:%S %p').replace('%R','%H:%M:%S');
	format=format.replace('%c',i18n.FORMAT_DATETIME).replace('%x',i18n.FORMAT_DATE).replace('%X',i18n.FORMAT_TIME);
	
    var tokens = format.match(/%./g);
	
	// the regex /\W+/ does not work for utf8 chars
    dateString.split(/[^A-Za-z0-9\u00A1-\uFFFF]+/).each(function(e, i){
      switch (tokens[i]) {
        case '%a': 
        case '%A': 
		case '%u':
		case '%w': break;

        case '%b': 
		case '%h': date.setMonth(i18n.MONTHS_SHORT.indexOf(e)); break;
        case '%B': date.setMonth(i18n.MONTHS.indexOf(e)); break;
		case '%C': break; //century
		case '%d':
        case '%e': date.setDate(parseInt(e,10)); break;
		case '%j': break; // day of year
        case '%m': date.setMonth(parseInt(e,10)-1); break;
        case '%w': date.setDay(parseInt(e,10)); break;
        case '%y': 
			var year=parseInt(e,10);
			if(year<50) year+=2000;
			if(year<100) year+=1900;
			date.setYear(year); 
			break;
        case '%Y': date.setFullYear(parseInt(e,10)); break;
		
		// time
		case '%H': date.setHours(parseInt(e,10)); break;
		case '%I': date.setHours(parseInt(e,10)); break;
		case '%M': date.setMinutes(parseInt(e,10)); break;
		case '%p': if(e=='pm') date.setHours(date.getHours()+12); break;
		case '%S': date.setSeconds(parseInt(e,10)); break;
      }
    });
    return date;
  }
});

UI.Calendar.Options = {
	MONTHS_SHORT: $w('Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'),
	MONTHS: $w('January February March April May June July August September October November December'),
	WEEKDAYS_1CHAR: $w('S M T W T F S'),
	WEEKDAYS_SHORT: $w('Su Mo Tu We Th Fr Sa'),
	WEEKDAYS_MEDIUM: $w('Sun Mon Tue Wed Thu Fri Sat'),
	WEEKDAYS: $w('Sunday Monday Tuesday Wednesday Thursday Friday Saturday'),
	
	FORMAT_DATE: '%m/%d/%Y',
	FORMAT_TIME: '%H:%M:%S',
	FORMAT_DATETIME: '%x %X',
	
	LABEL_MONTH: "Month",
	LABEL_YEAR: "Year"
};