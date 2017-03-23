(function() {

    var oneStandardDeviationPercent = .68;
    var twoStandardDeviationPercent = .95;

    var colors = {
        green: '#82b732',
        blue: '#3B8183',
        orange: '#f17232',
        red: '#c74a1a',
        gold: '#dbbd11',
        darkblue: '#007b88',
        gray: '#c9d0d4',
        darkgray: '#666666',
        purple: '#4A3A57'
    };

    var colorOrder = [
        colors.green,
        colors.blue,
        '#37b1be',
        '#e9a40f',
        '#e9730f',
        '#d64809',
        '#009a4d',
        '#246492',
        '#007b88',
        '#cb8a00',
        '#b63800',
        '#c95900',
        '#366166',
        '#408782',
        '#3e9a2f',
        '#a3c328',
        '#dbac13',
        '#e1790e',
        '#d55518',
        '#9e1f30', // colors from the picker
        '#5facb3',
        '#63d4ca',
        '#5ee747',
        '#79901e',
        '#a8850f',
        '#ae5e0a',
        '#a24213',
        '#eb2d48',
        '#d07dd1'
    ];

    Highcharts.setOptions({
        colors: colorOrder,
        chart: {
            style: {
                fontFamily: 'Lato, "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif'
            }
        }
    });

    var reducePieSeries = function(series, deviations, minimum, maximum) {

        var reduced = [];
        var deviations = deviations ? deviations : 2;
        var minimum = minimum ? Math.max(minimum, 5) : 5;
        var maximum = maximum ? Math.min(maximum, series.length) : series.length;
        var total = 0, mean = 0, mean = 0, i = 0, variance = 0, deviation = 0;
        var other = {name: 'Other', y: 0, color: colors.gray};
        var slice;
        var totalUsed = 0;
        var total = 0;
        var sqTotal = 0;

        // Put the larger items first
        series = series.sort(function(a, b) {
            return b.y - a.y;
        });

        // Not exact deviation but close enough
        for (i = 0; i < series.length; i++) {

            slice = series[i];

            if (slice.y > 0) {

                totalUsed++;
                total += slice.y;
                sqTotal += Math.pow(slice.y, 2);

                mean = total / totalUsed;
                variance = sqTotal / totalUsed - Math.pow(mean, 2);
                deviation = Math.sqrt(variance);

                // console.warn(reduced.length, minimum, slice.y, Math.max(mean - deviation*deviations, deviation / deviations), slice.name == 'Other');

                if (totalUsed > maximum ||
                    (reduced.length > minimum && slice.y <= Math.max(mean - deviation * deviations, deviation / deviations, 1) && slice.sliced !== true) ||
                    slice.name == 'Other'
                ) {
                    other.y += slice.y;
                } else {
                    reduced.push(slice);
                }

            }
        }

        if (other.y) {
            reduced.push(other);
        }

        return reduced;
    };


    var reduceTimeSeries = function(series, deviations, threshold) {
        var reduced = [];
        var deviations = deviations ? deviations : 2;
        var minimum = minimum ? Math.max(minimum, 3) : 3;

        series = series.sort(function(a,b){
            return b.total - a.total;
        });

        reduced = series;
        // console.warn(reduced);

        return reduced;
    };


    var ssCharts = {

        changeChartType: function(chart, newType) {

            var numSeries = chart.series.length;
            newType = newType.toLowerCase();

            chart.showLoading('Loading...');

            setTimeout(function() {
                for (var i=0; i < numSeries; i++) {
                    chart.series[i].update({ type: newType });
                }

                chart.hideLoading();
            }, 50);

        },


        /* Campaign Level Charts */
        salesGoal: function(renderTo, campaign, stats) {

            var options = $.extend(true, {
                title: {
                    text: ' '
                },
                chart: {
                    renderTo: renderTo,
                    type: 'column'
                },
                tooltip: {
                    formatter: salesTooltipFormat
                },
                yAxis: {
                    title: {
                        text: 'Sales'
                    },
                    stackLabels: {
                        enabled: true,
                        formatter: function() {
                            return (this.total > 0 ? (app.currency + _.number_format(this.total)) : '');
                        }
                    }
                },
                xAxis: {
                    categories: [stats.campaignName]
                },
                tooltip: {
                    formatter: function() {
                        return '<b>' + this.series.name + '</b>: ' + app.currency + _.number_format(this.y);
                    }
                },
                series: [
                    {
                        name: 'Exp. Value',
                        data: [stats.totalWorkingOppsExpectedValue],
                        stack: 'Sales',
                        color: colors.blue
                    },
                    {
                        name: 'Sales',
                        data: [stats.totalRevenue],
                        stack: 'Sales',
                        color: colors.green
                    },
                    {
                        name: 'Goal',
                        data: [stats.goal],
                        stack: 'Goal',
                        color: colors.red
                    },
                    {
                        name: 'Cost',
                        data: [(stats.totalCost + stats.otherCosts)],
                        stack: 'Cost',
                        color: colors.gold
                    }
                ]
            }, defaults);

            return (new Highcharts.Chart(options));
        },


        salesOverTime: function(renderTo, sales, interval, onClick) {

            var openCounts = [];
            var wonCounts = [];
            var today = new Date();

            var options = $.extend(true, {
                title: {
                    text: ' '
                },
                chart: {
                    renderTo: renderTo,
                    type: 'column',
                    marginRight: 220
                },

                yAxis: {
                    title: {
                        text: 'Sales'
                    }
                },

                xAxis: {
                    type: 'datetime',
                    plotLines: [{
                        value: today.moveToFirstDayOfMonth().getTime(),
                        color: '#cccccc',
                        dashStyle: 'longdashdot',
                        width: 1,
                        label: 'This Month'
                    }],
                    labels: {
                        formatter: function() {
                            var dateStr = Highcharts.dateFormat("%b '%y", this.value);
                            if (Math.abs(this.value - today.moveToFirstDayOfMonth().getTime()) < 86400000) {
                                return ['<b>', dateStr, ' (This Month)</b>'].join('');
                            }
                            return dateStr;
                        }
                    }
                },

                tooltip: {
                    formatter: function() {
                        count = 0;
                        switch (this.series.name) {
                            case 'Sales':
                                count = wonCounts[this.x];
                                break;
                            case 'Expected Value':
                                count = openCounts[this.x];
                                break;
                        }

                        return '<b>' + Highcharts.dateFormat('%b %e', this.x) + '</b><br/>' +
                            this.series.name + ': ' + app.currency + _.number_format(this.y) + '</b><br/>' +
                            'Opp Count: ' + _.number_format(count);
                    }
                },

                legend: {
                    align: 'right',
                    verticalAlign: 'top',
                    x: -15,
                    y: 15,
                    borderWidth:0,
                    width: 180,
                    layout: 'vertical',
                    itemMarginBottom: 5
                },

                plotOptions: {
                    series: {
                        cursor: 'pointer',
                        point: {
                            events: {
                                click: onClick
                            }
                        }
                    }
                },

                series: (function() {
                    var components = [];
                    var currentDate = new Date(Date.parse(sales.startDate));
                    currentDate.addHours(12);
                    currentDate.moveToFirstDayOfMonth();

                    if (_.interval.month == interval) {
                        rev = [], exp = [];

                        for (var i = 0; i < sales.sales.totals.length; i++) {
                            openCounts[currentDate.getTime()] = sales.expectedValue.openCount[i];
                            wonCounts[currentDate.getTime()] = sales.sales.wonCount[i];
                            rev.push( [currentDate.getTime(), sales.sales.totals[i]] );
                            exp.push( [currentDate.getTime(), sales.expectedValue.totals[i]] );
                            currentDate.addDays(31);
                            currentDate.moveToFirstDayOfMonth();
                        }

                        components.push({
                            name: 'Expected Value',
                            data: exp,
                            color: colors.blue
                        });

                        components.push({
                            name: 'Sales',
                            data: rev,
                            color: colors.green
                        });


                    } else {
                        components.push({
                            name: 'Sales',
                            data: data,
                            pointStart: (Date.parse(sales.startDate)),
                            pointInterval: interval
                        });
                    }

                    return components;

                })()

            }, defaults);

            options.chart.marginBottom = 35;

            return (new Highcharts.Chart(options));
        },


        // Views over time
        mediaViewsOverTime: function(renderTo, stats, media, links, interval) {

            var chartType = 'line';
            var options = $.extend(true, {
                title: {
                    text: ' '
                },
                chart: {
                    renderTo: renderTo,
                    type: chartType
                },

                yAxis: {
                    title: {
                        text: ' '
                    },
                    stackLabels: {
                        enabled: true,
                        formatter: function() {
                            return (this.total > 0 ? _.number_format(this.total) : '');
                        }
                    }
                },

                xAxis: {
                    type: 'datetime'
                },

                tooltip: {
                    formatter: function() {

                        var tip = '';

                        switch (interval) {
                            case 'month':
                                tip = '<b>' + t('monthOf_x', { x: Highcharts.dateFormat('%b', this.x) }) + '</b>';
                                break;

                            case 'week':
                                tip = '<b>' + t('weekOf_x', { x:   Highcharts.dateFormat('%b %e', this.x) }) + '</b>';
                                break;

                            case 'day':
                                t('dayOf_x', { x:   Highcharts.dateFormat('%b %e', this.x) }) + '</b>';
                                break;

                            default:
                                tip = Highcharts.dateFormat('%b %e', this.x);
                                break;
                        }

                        tip += '<br/>' + this.series.name + ': ' + this.y;

                        return tip;
                    }
                },

                series: (function() {
                    var components = [];
                    var day, days, total, date;

                    for (var linkID in stats.opens.links) {
                        if (stats.opens.links.hasOwnProperty(linkID)) {

                            linkSeries = stats.opens.links[linkID];

                            days = [], total = 0, dayCount = 0;
                            for (day in linkSeries) {
                                if (linkSeries.hasOwnProperty(day)) {
                                    date = Date.parse(day);
                                    item = [date, linkSeries[day]];
                                    item[1] = (chartType != 'area' && item[1] == 0) ? null : item[1];

                                    days.push(item);
                                    total += linkSeries[day];
                                }
                            }
                            if (total > 0) {
                                components.push({
                                    name: links[linkID] ? (links[linkID]['title'] || 'Default') : 'Total',
                                    data: days,
                                    stack: 'links',
                                    visible: true,
                                    total: total
                                });
                            }
                        }
                    }

                    // components = reduceTimeSeries(components);

                    return components;

                })()

            }, defaults);

            options.legend = {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'top',
                x: -15,
                y: 15,
                borderWidth:0,
                width: 270,
                itemMarginBottom: 5,
            };

            options.chart.marginBottom = 35;

            if (interval == 'month') {
                options.xAxis =  {
                    type: 'datetime',
                    dateTimeLabelFormats: { // don't display the dummy year
                        month: '%b'
                    },
                    tickInterval: 86400000 * 30

                };
            }
            return (new Highcharts.Chart(options));
        },

        /* Leads Over Time - On Campaign / Component Dashes */
        leadsOverTime: function(renderTo, leadsPerDay, interval, groupBy, focus) {

            var groupBy = (groupBy ? groupBy : 'campaigns');
            var chartType = 'column';

            switch (groupBy) {
                case 'types':
                    chartType = 'column';
                    break;

                case 'organicVsPaid':
                    chartType = 'area';
                    break;

                default:
                    chartType = 'column';
                    break;
            }

            if (!leadsPerDay || !leadsPerDay.totals) {
                return false;
            }

            if (groupBy && leadsPerDay[groupBy] && leadsPerDay[groupBy].length == 1) {
                chartType = 'area';
            }

            var options = $.extend(true, {
                title: {
                    text: ' '
                },
                chart: {
                    renderTo: renderTo,
                    type: chartType
                },

                yAxis: {
                    title: {
                        text: ' '
                    },
                    stackLabels: {
                        enabled: true,
                        formatter: function() {
                            return (this.total > 0 ? _.number_format(this.total) : '');
                        }
                    }
                },

                xAxis: {
                    type: 'datetime'
                },

                tooltip: {
                    formatter: function() {

                        var tip = '';

                        switch (interval) {
                            case 'month':
                                tip = '<b>' + t('monthOf_x', { x: Highcharts.dateFormat('%b', this.x) }) + '</b>';
                                break;

                            case 'week':
                                tip = '<b>' + t('weekOf_x', { x:   Highcharts.dateFormat('%b %e', this.x) }) + '</b>';
                                break;

                            case 'day':
                                t('dayOf_x', { x:   Highcharts.dateFormat('%b %e', this.x) }) + '</b>';
                                break;

                            default:
                                tip = Highcharts.dateFormat('%b %e', this.x);
                                break;
                        }

                        tip += '<br/>' + this.series.name + ': ' + this.y;

                        return tip;
                    }
                },

                series: (function() {
                    var components = [];
                    var camp, day, days, total, dayCount;

                    var totalCampaigns = 0;
                    var totalOther = 0;
                    var otherDays = {};

                    switch (groupBy) {
                        case 'date':

                            days = [], total = 0, dayCount = 0;
                            for (day in leadsPerDay.totals.interval) {
                                var date = Date.parse(day);
                                item = [date, leadsPerDay.totals.interval[day]];
                                item[1] = (chartType != 'area' && item[1] == 0) ? null : item[1];

                                days.push(item);
                                total += leadsPerDay.totals.interval[day];
                            }

                            components.push({
                                name: leadsPerDay['collectionName'],
                                data: days,
                                total: total
                            });
                            break;

                        case 'campaigns':

                            // First, sort the campaigns so we put the smallest campaigns in 'other'
                            leadsPerDay.campaigns.sort(function(a, b) {
                                return leadsPerDay.totals.campaigns[b.id] - leadsPerDay.totals.campaigns[a.id];
                            });

                            for (var i=0; i < leadsPerDay.campaigns.length; i++) {

                                camp = leadsPerDay.campaigns[i], item = null;

                                if (focus == camp.id || components.length < 6 || leadsPerDay.totals.campaigns[camp.id] ) {

                                    totalCampaigns++;

                                    // Only show 10 in the legend, 9 plus 'other campaigns'
                                    if (camp.id && components.length >= 9) {

                                        totalOther++;
                                        for (day in leadsPerDay.leads[camp.id]) {
                                            if (leadsPerDay.leads[camp.id].hasOwnProperty(day)) {
                                                if (otherDays[day]) {
                                                    otherDays[day] += leadsPerDay.leads[camp.id][day];
                                                } else {
                                                    otherDays[day] = leadsPerDay.leads[camp.id][day];
                                                }
                                            }
                                        }

                                    } else {
                                        days = [], total = 0, dayCount = 0;
                                        for (day in leadsPerDay.leads[camp.id]) {
                                            if (leadsPerDay.leads[camp.id].hasOwnProperty(day)) {
                                                var date = Date.parse(day);
                                                item = [date, leadsPerDay.leads[camp.id][day]];
                                                item[1] = (chartType != 'area' && item[1] == 0) ? null : item[1];

                                                days.push(item);
                                                total += leadsPerDay.leads[camp.id][day];
                                            }
                                        }


                                        components.push({
                                            name: camp.campaignName,
                                            data: days,
                                            stack: 'campaigns',
                                            visible: ((!focus || focus == camp.id)),
                                            total: total
                                        });
                                    }

                                }
                            }

                            if (totalOther) {
                                days = [], total = 0, dayCount = 0;
                                for (day in otherDays) {
                                    if (otherDays.hasOwnProperty(day)) {
                                        date = Date.parse(day);
                                        item = [date, otherDays[day]];
                                        item[1] = (chartType != 'area' && item[1] == 0) ? null : item[1];

                                        days.push(item);
                                        total += otherDays[day];
                                    }
                                }

                                components.push({
                                    name: (totalOther == totalCampaigns) ? t('all_campaigns') : t('other_campaigns_x', { x: totalOther }),
                                    data: days,
                                    stack: 'campaigns',
                                    visible: ((!focus || focus == camp.id)),
                                    total: total,
                                    color: colors.gray
                                });
                            }

                            break;

                        case 'types':

                            for (type in leadsPerDay.types) {

                                if (leadsPerDay.totals.types[type]) {
                                    days = [], total = 0;
                                    for (day in leadsPerDay.types[type]) {
                                        days.push([(new Date(day)).getTime(), leadsPerDay.types[type][day]]);
                                        total += leadsPerDay.types[type][day];
                                    }

                                    components.push({
                                        name: type,
                                        data: days,
                                        total: total
                                    });
                                }
                            }
                            break;

                        case 'organicVsPaid':

                            days = [], total = 0;
                            for (day in leadsPerDay.organic) {
                                days.push([(new Date(day)).getTime(), leadsPerDay.organic[day]]);
                                total += leadsPerDay.organic[day];
                            }

                            components.push({
                                name: 'Organic',
                                data: days,
                                total: total
                            });

                            days = [], total = 0;
                            for (day in leadsPerDay.organic) {
                                days.push([(new Date(day)).getTime(), leadsPerDay.paid[day]]);
                                total += leadsPerDay.paid[day];
                            }

                            components.push({
                                name: 'Paid',
                                data: days,
                                total: total
                            });

                            break;

                        default:

                            days = [], total = 0;
                            for (day in leadsPerDay.leads.totals) {
                                days.push([(new Date(day)).getTime(), leadsPerDay.leads.totals[day]]);
                                total += leadsPerDay.leads.totals[day];
                            }

                            components.push({
                                name: 'Totals',
                                data: days,
                                total: total
                            });
                    }

                    // NOTE: This replaced the `reduceTimeSeries` function, which didn't actually do anything other than sort
                    components.sort(function(a, b) {
                        // sort the components, with 'unassigned' and 'other' at the bottom
                        if (a.name.indexOf('Other Campaigns') !== -1) {
                            // a was the 'other' series, so make sure b goes ahead of it
                            return 1;
                        } else if (b.name.indexOf('Other Campaigns') !== -1) {
                            // b was the 'other' series, so make sure a goes ahead of it
                            return -1;
                        } else if (a.name.indexOf('Unassigned') !== -1) {
                            // now that we've already handled 'other', if a is 'unassigned' make sure b goes ahead
                            // i.e. 'other' is already last, so make sure 'unassigned' is second to last
                            return 1;
                        } else if (b.name.indexOf('Unassigned') !== -1) {
                            // if b was 'unassigned' make sure a goes ahead of it
                            return -1;
                        }

                        // if not one of our two special cases, simply do a comparison on the totals
                        return b.total - a.total;
                    });

                    return components;

                })()

            }, defaults);

            if (true) {
                options.legend = {
                    layout: 'vertical',
                    align: 'right',
                    verticalAlign: 'top',
                    x: -15,
                    y: 15,
                    borderWidth:0,
                    width: 270,
                    itemMarginBottom: 5,
                };

                options.chart.marginBottom = 35;
            }

            if (interval == 'month') {
                options.xAxis =  {
                    type: 'datetime',
                    dateTimeLabelFormats: { // don't display the dummy year
                        month: '%b',
                    },
                    tickInterval: 86400000 * 30

                };
            }

            return (new Highcharts.Chart(options));
        },


        /* Leads Over Time - On Campaign / Component Dashes */
        keywordsOverTime: function(renderTo, keywordData, leadsPerDay, interval, focus) {

            var chartType = 'line';

            // console.warn(keywordData);

            var options = $.extend(true, {
                title: {
                    text: ' '
                },
                chart: {
                    renderTo: renderTo,
                    type: chartType
                },

                yAxis: {
                    title: {
                        text: ' '
                    }
                },

                xAxis: {
                    type: 'datetime'
                },

                tooltip: {
                    formatter: function() {

                        var tip = '';

                        switch (interval) {
                            case 'month':
                                tip = '<b>' + t('monthOf_x', { x: Highcharts.dateFormat('%b', this.x) }) + '</b>';
                                break;

                            case 'week':
                                tip = '<b>' + t('weekOf_x', { x:   Highcharts.dateFormat('%b %e', this.x) }) + '</b>';
                                break;

                            case 'day':
                                t('dayOf_x', { x:   Highcharts.dateFormat('%b %e', this.x) }) + '</b>';
                                break;

                            default:
                                tip = Highcharts.dateFormat('%b %e', this.x);
                                break;
                        }

                        tip += '<br/>' + this.series.name + ': ' + this.y;

                        return tip;
                    }
                },

                series: (function() {
                    var item, day, days, components = [];

                    days = [];
                    for (day in keywordData.dayTotals) {
                        item = [(new Date(day)).getTime(), keywordData.dayTotals[day]];
                        item[1] = ((!item[1] || item[1] == 0)) ? null : item[1];
                        days.push(item);
                    }

                    components.push({
                        name: 'Clicks',
                        data: days
                    });

                    if (leadsPerDay && leadsPerDay.leads) {
                        days = [];
                        for (day in leadsPerDay.leads.totals) {

                            item = [(new Date(day)).getTime(), leadsPerDay.leads.totals[day]];
                            item[1] = ((!item[1] || item[1] == 0)) ? null : item[1];

                            days.push(item);
                        }

                        components.push({
                            name: 'Leads',
                            data: days
                        });
                    }

                    return components;

                })()

            }, defaults);

            if (true) {
                options.legend = {
                    layout: 'vertical',
                    align: 'right',
                    verticalAlign: 'top',
                    x: -15,
                    y: 15,
                    borderWidth:0,
                    width: 270,
                    maxHeight: 150,
                    itemMarginBottom: 5
                };

                options.chart.marginBottom = 35;
            }

            if (interval == 'month') {
                options.xAxis =  {
                    type: 'datetime',
                    dateTimeLabelFormats: { // don't display the dummy year
                        month: '%b'
                    },
                    tickInterval: 86400000 * 30

                };
            }

            return (new Highcharts.Chart(options));
        },



        /* Campaign Comparisions */
        campaignPie: function(renderTo, campaigns, stats, compare, sliceID, showLegend) {

            var compare = compare ? compare : 'totals';
            var sliceID = sliceID ? sliceID : false;
            var showLegend = showLegend ? true: false;
            var slices = [];
            var noData = false;

            var title = ' ', subtitle = ' ';
            switch(compare) {

                case 'leads':
                    title = "Leads";
                    subtitle = "<em>" + t('chartsTotalOf') + ' ' + _.number_format(stats.totals['Leads']) + '</em>';
                    break;

                case 'sales':
                case 'revenue':
                    title = 'Sales';
                    subtitle = "<em>" + t('chartsTotalOf') + ' ' + app.currency + _.number_format(stats.totals['Revenue']) + '</em>';
                    break;

                case 'expValue':
                    title = 'Expected Value';
                    subtitle = "<em>" + t('chartsTotalOf') + ' ' + app.currency + _.number_format(stats.totals['Working_Opps_ExpValue']) + '</em>';
                    break;

                case 'totals':
                default:
                    title = 'Forecast';
                    subtitle = "<em>" + t('chartsTotalOf') + ' ' + app.currency + _.number_format(stats.totals['Total_EV']) + '</em>';
            }


            var options = $.extend(true, {
                title: {
                    text: title
                },
                subtitle: {
                    text: subtitle
                },
                chart: {
                    renderTo: renderTo,
                    spacingBottom: 20
                },
                tooltip: {
                    formatter: ((compare == 'leads') ? pieTooltipFormat : pieMoneyTooltipFormat)
                },

                series: [{
                    type: 'pie',
                    name: title,
                    data: (function(){
                        var camp;

                        for (var cid in campaigns) {

                            try {

                                camp = campaigns[cid];

                                if (stats.campaigns[camp.id]) {

                                    slice = {name: camp.campaignName};
                                    if (sliceID == camp.id) { slice.sliced = true; }

                                    switch (compare) {

                                        case 'leads':
                                            slice.y = stats.campaigns[camp.id].totalLeads;
                                            break;

                                        case 'sales':
                                        case 'revenue':
                                            slice.y = stats.campaigns[camp.id].totalRevenue;
                                            break;

                                        case 'expValue':
                                            slice.y = stats.campaigns[camp.id].totalExpectedValue;
                                            break;

                                        case 'totals':
                                        default:
                                            slice.y = stats.campaigns[camp.id].totalWorkingOppsExpectedValue;
                                            break;
                                    }

                                    slices.push(slice);
                                }


                            } catch (err) { console.warn('Campaign Stat Error', err, camp.id, stats.campaigns[camp.id]); }
                        }

                        slices = reducePieSeries(slices);

                        if (!slices.length) {
                            noData = true;
                            slices.push({name: 'No Data', y:1, color: '#ccc'});
                        }

                        return slices;

                    })()
                }]
            }, defaults);

            options.chart.marginTop = 45;
            options.chart.marginBottom = 20;

            if (!noData && showLegend) {
                options.plotOptions.pie.dataLabels.enabled = true;
                options.plotOptions.pie.dataLabels.connectorWidth = 2;
                options.plotOptions.pie.dataLabels.connectorPadding = 10;
                options.plotOptions.pie.dataLabels.distance = 15;
            }

            var chart = new Highcharts.Chart(options);

            if (noData) {
                chart.showLoading('No Data to Display');
            }

            return (chart);
        },


        campaignLeadsByTimePie: function(renderTo, campaigns, leadsPerDay, compare, sliceID, title) {

            var compare = compare ? compare : 'leads';
            var sliceID = sliceID ? sliceID : false;
            var showLegend = showLegend ? true: true;
            var slices = [];
            var noData = false;
            var total = 0;

            var title = title ? title : 'Leads';
            var subtitle = ' ';
            var unassignedCount = _.orEqual(leadsPerDay.totals.campaigns[0], 0);

            var options = $.extend(true, {
                title: {
                    text: title
                },
                subtitle: {
                    text: subtitle
                },
                chart: {
                    renderTo: renderTo,
                    spacingBottom: 20
                },
                tooltip: {
                    formatter: ((compare == 'leads') ? pieTooltipFormat : pieMoneyTooltipFormat)
                },

                series: [{
                    type: 'pie',
                    name: title,
                    data: (function(){
                        var camp, value;

                        if (leadsPerDay && leadsPerDay.totals && leadsPerDay.totals.campaigns) {
                            for (var cid in leadsPerDay.totals.campaigns) {

                                try {

                                    camp = campaigns[cid];
                                    value = leadsPerDay.totals.campaigns[cid];

                                    if (cid != 0 && camp) {

                                        slice = {name: camp.campaignName};
                                        if (sliceID == camp.id) { slice.sliced = true; }
                                        slice.y = value;
                                        total += value;

                                        slices.push(slice);
                                    }


                                } catch (err) { console.warn('Campaign Stat Error', err, camp.id); }
                            }
                        }

                        slices = reducePieSeries(slices);

                        if (!slices.length) {
                            noData = true;
                            slices.push({name: 'No Data', y:1, color: '#ccc'});
                        }

                        return slices;

                    })()
                }]
            }, defaults);

            options.subtitle.text = _.number_format(total) + ' Assigned   (' + _.number_format(unassignedCount) + ' unassigned)';
            options.chart.marginTop = 45;
            options.chart.marginBottom = 20;

            if (!noData && showLegend) {
                options.plotOptions.pie.dataLabels.enabled = true;
                options.plotOptions.pie.dataLabels.connectorWidth = 2;
                options.plotOptions.pie.dataLabels.connectorPadding = 10;
                options.plotOptions.pie.dataLabels.distance = 15;
            }

            var chart = new Highcharts.Chart(options);

            if (noData) {
                chart.showLoading('No Data to Display');
            }

            return (chart);
        },


        campaignCostPie: function(renderTo, campaigns, stats, sliceID) {

            var sliceID = sliceID ? sliceID : false;
            var showLegend = showLegend ? true: true;
            var slices = [];
            var noData = false;
            var total = 0;
            var title = 'Campaign Cost', subtitle = ' ';

            var options = $.extend(true, {
                title: {
                    text: title
                },
                subtitle: {
                    text: subtitle
                },
                chart: {
                    renderTo: renderTo,
                    spacingBottom: 20
                },
                tooltip: {
                    formatter: (pieMoneyTooltipFormat)
                },

                series: [{
                    type: 'pie',
                    name: title,
                    data: (function(){
                        var camp;

                        for (var cid in campaigns) {

                            try {

                                camp = campaigns[cid];

                                if (camp) {

                                    slice = {name: camp.campaignName};
                                    if (sliceID == camp.id) { slice.sliced = true; }

                                    if (camp.perEachPricing) {
                                        slice.y = (stats.campaigns[camp.id] ? camp.price * stats.campaigns[camp.id].totalCampaignCost : 0) + camp.otherCosts;
                                    } else {
                                        slice.y = (camp.price * camp.qty) + camp.otherCosts;
                                    }

                                    total += slice.y;

                                    slices.push(slice);
                                }


                            } catch (err) { console.warn('Campaign Stat Error', err, camp.id, camp.campaigns[camp.id]); }
                        }

                        slices = reducePieSeries(slices);

                        if (!slices.length) {
                            noData = true;
                            slices.push({name: 'No Data', y:1, color: '#ccc'});
                        }

                        return slices;

                    })()
                }]
            }, defaults);

            options.subtitle.text = app.currency + _.number_format(total) + t('chartsTotalCost');
            options.chart.marginTop = 45;
            options.chart.marginBottom = 20;

            if (!noData && showLegend) {
                options.plotOptions.pie.dataLabels.enabled = true;
                options.plotOptions.pie.dataLabels.connectorWidth = 2;
                options.plotOptions.pie.dataLabels.connectorPadding = 10;
                options.plotOptions.pie.dataLabels.distance = 15;
            }

            var chart = new Highcharts.Chart(options);

            if (noData) {
                chart.showLoading('No Data to Display');
            }

            return (chart);

        },


        campaignCompareTotals: function(renderTo, stats, compareBy) {

            var showLegend = showLegend ? true: true;
            var noData = false;

            var title = ' ', subtitle = ' ';
            var compareBy = 'total';


            var options = $.extend(true, {
                title: {
                    text: title
                },
                subtitle: {
                    text: subtitle
                },
                chart: {
                    renderTo: renderTo,
                    spacingBottom: 20,
                    type: 'column'
                },

                yAxis: {
                    title: {
                        text: ' '
                    },
                    stackLabels: {
                        enabled: true,
                        formatter: function() {
                            return (this.total > 0 ? _.number_format(this.total) : '');
                        }
                    }
                },
                xAxis: {
                    categories: ['Totals']
                },
                series: (function(){
                    var camp, series = [];

                    if (compareBy == 'campaigns') {

                        for (var cid in stats['campaigns']) {

                            try {

                                var data = [];
                                camp = stats['campaigns'][cid];

                                data.push([(stats['leadTypes'] ? stats.leadTypes : 'Leads'), camp.totalLeads]);
                                data.push(['Opps', camp.totalWorkingOppsCount]);
                                data.push(['Sales', camp.totalSalesCount]);

                                series.push({
                                    name: camp.campaignName ? camp.campaignName : 'Unassigned',
                                    data: data,
                                    visible: camp.campaignName ? true : false
                                });

                                series.sort(function(a,b) {

                                    return  b.data[0][1] - a.data[0][1];

                                });

                            } catch (err) { console.warn('Campaign Stat Error', err, camp.id, camp.campaigns[camp.id]); }


                        }

                    } else {

                        try {

                            var data = [];

                            series.push({
                                //name: ('Campaign ' + (stats['leadTypes'] ? stats.leadTypes : ' Leads')),
                                name: ('Campaign Leads'),
                                stack: 'Campaign Leads',
                                data: [stats['totals'].totalCampaignLeadCount],
                                color: colors.blue
                            });

                            series.push({
                                //name: ('Unassigned ' + (stats['leadTypes'] ? stats.leadTypes : ' Leads')),
                                name: ('Unassigned Leads'),
                                stack: 'Unassigned',
                                data: [stats['totals'].totalUnassignedLeadCount],
                                color: colors.darkblue
                            });

                            series.push({
                                name: 'Opps',
                                stack: 'Opps',
                                data: [stats['totals'].totalWorkingOppsCount],
                                color: colors.gold
                            });

                            series.push({
                                name: 'Sales',
                                stack: 'Opps',
                                data: [stats['totals'].totalSalesCount],
                                color: colors.green
                            });

                            series.push({
                                name: 'Lost',
                                stack: 'Opps',
                                data: [stats['totals'].totalLostOppsCount],
                                color: colors.red
                            });

                        } catch (err) { console.warn('Campaign Stat Error', err, camp.id, camp.campaigns[camp.id]); }

                    }

                    return series;

                })()

            }, defaults);

            if (true) {
                options.legend = {
                    layout: 'vertical',
                    align: 'right',
                    verticalAlign: 'top',
                    x: -15,
                    y: 30,
                    borderWidth:0,
                    width: 220,
                    itemMarginBottom: 5
                };

                options.chart.marginBottom = 35;
            }

            var chart = new Highcharts.Chart(options);

            if (noData) {
                chart.showLoading('No Data to Display');
            }

            return (chart);

        },

        campaignSalesBreakdown: function(renderTo, stats, compareBy) {

            var showLegend = showLegend ? true: true;
            var noData = false;

            var title = ' ', subtitle = ' ';
            var compareBy = 'total';

            var options = $.extend(true, {
                title: {
                    text: title
                },
                subtitle: {
                    text: subtitle
                },
                chart: {
                    renderTo: renderTo,
                    spacingBottom: 20,
                    type: 'column'
                },

                yAxis: {
                    title: {
                        text: ' '
                    },
                    stackLabels: {
                        enabled: true,
                        formatter: function() {
                            return (this.total > 0 ? _.number_format(this.total) : '');
                        }
                    }
                },
                xAxis: {
                    categories: ['Opportunities']
                },
                series: (function(){
                    var series = [];

                    try {

                        var data = [];

                        series.push({
                            name: ('Total Opportunities'),
                            stack: 'Total Opportunities',
                            data: [stats['totals'].totalOppCount],
                            color: colors.blue
                        });

                        series.push({
                            name: 'Open Opportunities',
                            stack: 'Open Opportunities',
                            data: [stats['totals'].totalWorkingOppsCount],
                            color: colors.gold
                        });

                        series.push({
                            name: 'Sales',
                            stack: 'Sales',
                            data: [stats['totals'].totalSalesCount],
                            color: colors.green
                        });

                    } catch (err) { console.warn('Campaign Stat Error', err); }

                    return series;

                })()

            }, defaults);

            if (true) {
                options.legend = {
                    layout: 'vertical',
                    align: 'right',
                    verticalAlign: 'top',
                    x: -15,
                    y: 30,
                    borderWidth:0,
                    width: 220,
                    itemMarginBottom: 5
                };

                options.chart.marginBottom = 35;
            }

            var chart = new Highcharts.Chart(options);

            if (noData) {
                chart.showLoading('No Data to Display');
            }

            return (chart);

        },


        /* Sources Pie */
        sourcesPie: function(renderTo, sources, sourceType, sliceID) {

            var sliceID = sliceID ? sliceID : false;
            var valPrefix = app.currency;

            var title = 'Top Keywords', subtitle = ' ';

            switch (source) {
                case 'landing':
                    title = 'Top Landing Pages';
                    break;
                case 'referrers':
                    title = 'Top Referrers';
                    break;

            }

            var options = $.extend(true, {
                title: {
                    text: title
                },
                subtitle: {
                    text: subtitle
                },
                chart: {
                    renderTo: renderTo,
                    spacingBottom: 10
                },
                tooltip: {
                    formatter: pieTooltipFormat
                },
                series: [{
                    type: 'pie',
                    name: title,
                    data: (function(){
                        var slices = [], slice, i=0;
                        var displayName = '';
                        var other = {name: 'Other', y: 0};

                        for (var keyword in sources.totals) {
                            displayName = (keyword == '/') ? 'Home Page' : keyword;
                            slice = {name: displayName, y: parseInt(sources.totals[keyword]), sliced: (i++ == 0)};
                            slices.push(slice);
                        }

                        slices = reducePieSeries(slices);

                        return slices;

                    })()
                }]
            }, defaults);

            options.plotOptions.pie.dataLabels.enabled = true;
            options.plotOptions.pie.dataLabels.formatter = function() {
                return ((this.y > 0  && sliceID == this.point.x) ? (this.key) : '');
            };

            options.chart.marginTop = 45;
            options.chart.marginBottom = 15 ;

            return (new Highcharts.Chart(options));
        },

        /* Email Sends */
        emailSendsOverTime: function(renderTo, emailSends, interval) {

            var chartType = 'line';

            var options = $.extend(true, {
                title: {
                    text: ' '
                },
                chart: {
                    renderTo: renderTo,
                    type: chartType
                },

                yAxis: {
                    title: {
                        text: ' '
                    },
                    stackLabels: {
                        enabled: true,
                        formatter: function() {
                            return (this.total > 0 ? _.number_format(this.total) : '');
                        }
                    }
                },

                xAxis: {
                    type: 'datetime'
                },

                tooltip: {
                    formatter: function() {

                        var tip = '';

                        switch (interval) {
                            case 'month':
                                tip = '<b>Month of '+ Highcharts.dateFormat('%b', this.x) +'</b>';
                                break;

                            case 'week':
                                tip = '<b>Week of '+ Highcharts.dateFormat('%b %e', this.x) +'</b>';
                                break;

                            case 'day':
                                tip = '<b>Day of '+ Highcharts.dateFormat('%b %e', this.x) +'</b>';
                                break;

                            default:
                                tip = Highcharts.dateFormat('%b %e', this.x);
                                break;
                        }

                        tip += '<br/>'+ this.series.name + ': '+ this.y;

                        return tip;
                    }
                },

                series: (function() {
                    var components = [];
                    var day, date;

                    var listSends = [];
                    var automationSends = [];
                    var smartSends = [];
                    var totalSends = [];
                    var emailsSent = [];

                    for (day in emailSends.series) {
                        if (emailSends.series.hasOwnProperty(day)) {
                            date = Date.parse(day);
                            listSends.push([date, emailSends.series[day].listSends]);
                            automationSends.push([date, emailSends.series[day].automationSends]);
                            smartSends.push([date, emailSends.series[day].smartSends]);
                            totalSends.push([date, emailSends.series[day].totalSends]);
                            emailsSent.push([date, emailSends.series[day].emailsSent]);
                        }
                    }

                    components.push({
                        name: t('dashboard_chart_total_sends'),
                        data: totalSends,
                        total: emailSends.totals.totalSends,
                        visible: true
                    });

                    components.push({
                        name: t('lists'),
                        data: listSends,
                        total: emailSends.totals.listSends,
                        visible: false
                    });

                    components.push({
                        name: t('workflows'),
                        data: automationSends,
                        total: emailSends.totals.automationSends,
                        visible: false
                    });

                    components.push({
                        name: t('dashboard_chart_smart_sends'),
                        data: smartSends,
                        total: emailSends.totals.smartSends,
                        visible: false
                    });

                    components.push({
                        name: t('dashboard_chart_total_unique_email'),
                        data: emailsSent,
                        total: emailSends.totals.emailsSent,
                        visible: false
                    });

                    return components;

                })()

            }, defaults);

            // Change Legend
            options.legend = {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'top',
                x: -15,
                y: 15,
                borderWidth:0,
                width: 270,
                itemMarginBottom: 5
            };
            options.chart.marginBottom = 35;

            if (interval == 'month') {
                options.xAxis =  {
                    type: 'datetime',
                    dateTimeLabelFormats: { // don't display the dummy year
                        month: '%b'
                    },
                    tickInterval: 86400000 * 30

                };
            }

            return (new Highcharts.Chart(options));
        },


        /* Email Delivery Pie */
        emailDeliveryPie: function(renderTo, totals) {

            var sliceID = sliceID ? sliceID : false;
            var title = t('delivery'), subtitle = ' ';

            var options = $.extend(true, {
                title: {
                    text: title
                },
                subtitle: {
                    text: subtitle
                },
                chart: {
                    renderTo: renderTo,
                    spacingBottom: 10
                },
                plotOptions: {
                    pie: {
                        borderColor: '#FFFFFF',
                        borderWidth: 2,
                        innerSize: '60%'
                    }
                },
                tooltip: {
                    formatter: pieTooltipFormat
                },
                series: [{
                    type: 'pie',
                    name: title,
                    data: (function() {
                        var slices = [];

                        slices.push({name: t('deliveries'), y: parseInt(totals['deliveries'])});
                        slices.push({name: t('hardbounces'), y: parseInt(totals['hardBounces'])});
                        slices.push({name: t('softbounces'), y: parseInt(totals['softBounces'])});
                        slices.push({name: t('spamcomplaints'), y: parseInt(totals['spamComplaint'])});

                        return slices;

                    })()
                }]
            }, cleanDefaults);

            options.plotOptions.pie.dataLabels.enabled = false;
            options.chart.marginTop = 45;
            options.chart.marginBottom = 15 ;

            return (new Highcharts.Chart(options));
        },

        emailEngagementPie: function(renderTo, totals) {

            var sliceID = sliceID ? sliceID : false;
            var title = t('engagement'), subtitle = ' ';

            var options = $.extend(true, {
                title: {
                    text: title
                },
                subtitle: {
                    text: subtitle
                },
                chart: {
                    renderTo: renderTo,
                    spacingBottom: 10
                },
                plotOptions: {
                    pie: {
                        borderColor: '#FFFFFF',
                        borderWidth: 2,
                        innerSize: '60%'
                    }
                },
                tooltip: {
                    formatter: pieTooltipFormat
                },
                series: [{
                    type: 'pie',
                    cursor: 'default',
                    name: title,
                    data: (function() {
                        var slices = [];

                        slices.push({name: t('unopened'), y: parseInt(totals['unopen'])});
                        slices.push({name: t('opens'), y: parseInt(totals['open'])});
                        slices.push({name: t('clicks'), y: parseInt(totals['click'])});
                        slices.push({name: t('unsubscribes'), y: parseInt(totals['unsubscribes'])});

                        return slices;

                    })()
                }]
            }, cleanDefaults);

            options.plotOptions.pie.dataLabels.enabled = true;
            options.chart.marginTop = 45;
            options.chart.marginBottom = 15;

            return (new Highcharts.Chart(options));
        },

        emailDomainsPie: function(renderTo, totals) {

            var sliceID = sliceID ? sliceID : false;
            var title = t('topdomains'), subtitle = ' ';
            var domain, other;

            var options = $.extend(true, {
                chart: {
                    renderTo: renderTo,
                    spacingBottom: 10
                },
                title: {
                    text: title
                },
                subtitle: {
                    text: subtitle
                },
                tooltip: {
                    formatter: pieTooltipFormat
                },
                plotOptions: {
                    pie: {
                        borderColor: '#FFFFFF',
                        borderWidth: 2,
                        innerSize: '60%'
                    }
                },
                series: [{
                    type: 'pie',
                    cursor: 'default',
                    name: title,
                    data: (function() {
                        var slices = [];

                        for (domain in totals.domains) {
                            if (totals.domains.hasOwnProperty(domain)) {
                                slices.push({name: domain, y: parseInt(totals.domains[domain])});
                            }
                        }

                        slices = reducePieSeries(slices, 1, 3, 5);

                        if (slices[slices.length-1].name == 'Other') {
                            other = slices[slices.length - 1];
                            return slices.splice(0, slices.length - 1);
                        }

                        return slices;

                    })()
                }]
            }, cleanDefaults);

            options.plotOptions.pie.dataLabels.enabled = true;
            options.chart.marginTop = 45;
            options.chart.marginBottom = 15;
            options.plotOptions.pie.dataLabels.formatter = function() {
                return ((this.y > 0  && sliceID == this.point.x) ? (this.key) : '');
            };

            var chart = new Highcharts.Chart(options);

            var html = '';
            _.each(chart.series[0].data, function(domain) {
                html += [
                    '<li class="table-row">',
                    '<span class="top-links-item-l lead-left-wrap" title="' + domain.name + '">',
                    domain.name,
                    '</span>',
                    '<a class="pull-right btn btn-mini email-report-legend" style="background-color: '+ domain.color +';" data-legend-domain="' + domain.name + '">',
                    domain.y,
                    '</a>',
                    '</li>'
                ].join('');
            });

            if (other) {
                html += [
                    '<li class="table-row">',
                    '<span class="top-links-item-l lead-left-wrap">',
                    other.name,
                    '</span>',
                    '<a class="pull-right btn btn-mini email-report-legend">',
                    other.y,
                    '</a>',
                    '</li>'
                ].join('');
            }

            $('.top-domains-legend').html(html);

            return (chart);
        },

        emailLinksPie: function(renderTo, totals) {

            var sliceID = sliceID ? sliceID : false;
            var title = t('link_clicks'), subtitle = ' ';
            var link, label, firstSlash, urlID;

            var options = $.extend(true, {
                title: {
                    text: title
                },
                subtitle: {
                    text: subtitle
                },
                chart: {
                    renderTo: renderTo,
                    spacingBottom: 10
                },
                plotOptions: {
                    pie: {
                        borderColor: '#FFFFFF',
                        borderWidth: 2,
                        innerSize: '60%',

                        // With long labels, the default behavior is for the pie
                        // to shrink. This directive tells it to stay at a fixed size
                        size: '100%'
                    }
                },
                tooltip: {
                    formatter: pieTooltipFormat
                },
                series: [{
                    type: 'pie',
                    cursor: 'default',
                    name: title,
                    data: (function() {
                        var slices = [];

                        for (link in totals.linkClicks) {
                            if (totals.linkClicks.hasOwnProperty(link)) {
                                // The raw URL being passed into this function is not what we want to present to the user
                                var parsedURL = totals.linkClicks[link].parsedURL;

                                firstSlash = parsedURL.indexOf('/');
                                urlID = parsedURL.replace(/[\/.]/g, '');
                                label = parsedURL.substr(0, firstSlash) + (parsedURL.substr(firstSlash, 40) == '/' ? '' : ('<br/>' + parsedURL.substr(firstSlash, 40)));

                                // If this is a media URL, use the title attribute rather than the URL
                                if (totals.linkClicks[link].isMediaURL === true) {
                                    slices.push({name: totals.linkClicks[link].title, link: urlID, y: parseInt(totals.linkClicks[link].clicks)});
                                } else {
                                    slices.push({name: label, link: urlID, y: parseInt(totals.linkClicks[link].clicks)});
                                }
                            }
                        }

                        slices = reducePieSeries(slices, 2, 5, 10);
                        return slices;
                    })()
                }]
            }, cleanDefaults);

            options.plotOptions.pie.dataLabels.enabled = true;
            options.chart.marginTop = 45;
            options.chart.marginBottom = 15 ;
            options.plotOptions.pie.dataLabels.formatter = function() {
                return ((this.y > 0  && sliceID == this.point.x) ? (this.key) : '');
            };

            var chart = new Highcharts.Chart(options);
            _.each(chart.series[0].data, function(link) {
                var urlID = link.link ? link.link.replace(/[\/.]/g, '') : '';
                $('[data-legend-link="' + urlID + '"]').css('background-color', link.color);
            });

            return chart;
        },

        emailUnsubsPie: function(renderTo, totals, unsubReasonLabels) {

            var sliceID = sliceID ? sliceID : false;
            var title = t('unsubscribes'), subtitle = ' ';
            var reason, label, slice;

            var options = $.extend(true, {
                chart: {
                    renderTo: renderTo,
                    spacingBottom: 10
                },
                title: {
                    text: title
                },
                subtitle: {
                    text: subtitle
                },
                tooltip: {
                    formatter: pieTooltipFormat
                },
                plotOptions: {
                    pie: {
                        borderColor: '#FFFFFF',
                        borderWidth: 2,
                        innerSize: '60%'
                    }
                },
                series: [{
                    type: 'pie',
                    name: title,
                    data: (function() {
                        var slices = [];
                        for (reason in totals.unsubscribeReasons) {
                            if (totals.unsubscribeReasons.hasOwnProperty(reason)) {
                                label = t(unsubReasonLabels[reason]);
                                slices.push({name: label, reason: reason, y: parseInt(totals.unsubscribeReasons[reason])});
                            }
                        }
                        slices = reducePieSeries(slices, 2, 5, 10);
                        return slices;

                    })()
                }]
            }, cleanDefaults);

            options.plotOptions.pie.dataLabels.enabled = true;
            options.chart.marginTop = 45;
            options.chart.marginBottom = 15 ;
            options.plotOptions.pie.dataLabels.formatter = function() {
                return ((this.y > 0  && sliceID == this.point.x) ? (this.key) : '');
            };

            var chart = new Highcharts.Chart(options);
            _.each(chart.series[0].data, function(reason) {
                $('[data-legend-reason=' + reason.reason + ']').css('background-color', reason.color);
            });

            return chart;
        },

        emailOverTime: function(renderTo, data) {

            var chartType = 'line';

            var yAxis = [
                { // Primary yAxis
                    labels: {
                        format: '{value}',
                        style: {
                            color: '#222222'
                        }
                    },
                    title: {
                        text: 'Sends & Opens',
                        style: {
                            color: '#222222'
                            //color: Highcharts.getOptions().colors[2]
                        }
                    }
                }, { // Secondary yAxis
                    gridLineWidth: 0,
                    title: {
                        text: 'Engagement',
                        style: {
                            color: '#222222'
                        }
                    },
                    labels: {
                        format: '{value}',
                        style: {
                            color: '#222222'
                        }
                    },
                    opposite: true
                }
            ];
            var options = $.extend(true, {
                title: {
                    text: ' ',
                    align: 'left'
                },
                chart: {
                    renderTo: renderTo,
                    marginRight: 300,
                    marginBottom: 30
                },
                plotOptions: {
                    line: {connectNulls: true}
                },
                xAxis: {
                    type: 'datetime',
                    minTickInterval: 60*60*1000,
                    labels: {
                        formatter: function() {
                            return timestampToHourlyRange(this.value, true);
                        }
                    }
                },

                legend: {
                    align: 'right',
                    verticalAlign: 'top',
                    x: 35,
                    y: 15,
                    borderWidth:0,
                    itemMarginBottom: 5,
                    width: 260,
                    layout: 'vertical'
                },

                tooltip: {
                    formatter: hourlyTooltipFormat
                },

                series: (function() {

                    var days = [], total = 0;
                    var series = [], eventDate = null, event=null;

                    for (var key in data) {

                        stat = data[key];
                        days = [];
                        total = 0;

                        for (day in stat) {
                            days.push([new Date(Date.parse(day)).getTime(), stat[day]]);
                            total += stat[day];
                        }

                        series.push({
                            name: key,
                            stack: key,
                            data: days,
                            total: total,
                            yAxis: (key == 'Opens' ? 0 : 1),
                            type: (key == 'Opens' ? 'area' : 'line'),
                            visible: (key === 'Clicks' || key == 'Opens')
                        });
                    }

                    return series;

                })()

            }, defaults);

            options.chart.marginBottom = 50;
            options.yAxis = yAxis;

            return (new Highcharts.Chart(options));
        },


        /* Sales Reps Comparison */
        repWorkingOpps: function(renderTo, workingOpps, onClick) {

            var options = $.extend(true, {
                title: {
                    text:  t('chartsTotalOf') + ' ' + app.currency + _.  number_format(workingOpps.totals.combinedTotal)
                },
                chart: {
                    renderTo: renderTo,
                    type: 'column'
                },
                yAxis: {
                    title: {
                        text: 'Total Sales'
                    },
                    labels: {
                        formatter: function() {
                            return app.currency + _.number_format(this.value);
                        }
                    },
                    stackLabels: {
                        enabled: true,
                        formatter: function() {
                            return (this.total > 0 ? (app.currency + _.number_format(this.total)) : '');
                        }
                    }
                },
                xAxis: {
                    categories: workingOpps.summaries.displayNames
                },

                tooltip: {
                    formatter: salesTooltipFormat
                },

                series: [
                    {
                        name: 'Expected Value',
                        data: workingOpps.summaries.expValueTotal,
                        color: colors.blue
                    },
                    {
                        name: 'Sales',
                        data: workingOpps.summaries.salesTotal,
                        color: colors.green
                    }
                ]
            }, defaults);

            var chart = new Highcharts.Chart(options);

            return (chart);
        },

        // Web Visitors

        visitsOverTime: function(renderTo, visitors, interval) {

            var chartType = 'line';
            // console.warn(renderTo, leadsPerDay);

            var options = $.extend(true, {
                title: {
                    text: ' ',
                    align: 'left'
                },
                chart: {
                    renderTo: renderTo,
                    type: chartType,
                    marginRight: 220,
                    marginBottom: 10
                },

                yAxis: {
                    title: {
                        text: ' '
                    },
                    stackLabels: {
                        enabled: true,
                        formatter: function() {
                            return (this.total > 0 ? _.number_format(this.total) : '');
                        }
                    }
                },

                xAxis: {
                    type: 'datetime'
                },

                legend: {
                    align: 'right',
                    verticalAlign: 'top',
                    x: -15,
                    y: 15,
                    borderWidth:0,
                    width: 180,
                    layout: 'vertical'
                },

                series: (function() {

                    var series = [], visits = [], visitDate = null, group;

                    var order = [{name: 'visits', label: 'Visits'},
                        {name: 'uniques', 'label': 'Unique Visitors'},
                        {name: 'direct', 'label': 'Direct Traffic'},
                        {name: 'search', 'label': 'Search Traffic'},
                        {name: 'bounces', 'label': 'Bounces'},
                        {name: 'pages', 'label': 'Pages'}
                    ];

                    for (var item in order) {

                        visits = [];
                        group = order[item];

                        for (var date in visitors.series[group.name]) {
                            // PDF webkit browser does not correctly parse "-" based dates
                            visitDate = (new Date(date.replace(/-/g, "/")));
                            visits.push( [ visitDate.getTime(), visitors.series[group.name][date] ] );
                        }

                        // We cant depend on properties to stay in order, so sort the array by
                        // timestamp before sending it to highcharts.
                        visits.sort(function(a, b) {
                            return a[0] - b[0];
                        });

                        series.push({
                            name: group.label,
                            data: visits,
                            marker: {symbol: 'circle'},
                            visible: (group.name === 'visits' || group.name == 'uniques' || group.name == 'search')
                        });

                    }

                    return series;

                })()

            }, defaults);

            if (interval == 'month') {
                options.xAxis =  {
                    type: 'datetime',
                    dateTimeLabelFormats: {
                        month: '%b'
                    },
                    tickInterval: 86400000 * 30

                };
            }

            options.chart.marginBottom = 35;

            //Highcharts is stupid. It only lets you set this as a *global* option, across all charts.
            //Setting it during chart creation and then reverting the value back to true will "sort of"
            //work, in that the series nodes are correctly placed, but the tooltip values will be incorrect -
            //they will use the new value of true. Thus, this is the only "real" solution. It hopefully shouldn't
            //conflict with anything.
            Highcharts.setOptions({
                global: {
                    useUTC: false,
                },
            });
            return (new Highcharts.Chart(options));
        },


        formLeadsOverTime: function(renderTo, formLeads, interval) {

            var chartType = 'column';

            var options = $.extend(true, {
                title: {
                    text: ' ',
                    align: 'left'
                },
                chart: {
                    renderTo: renderTo,
                    type: chartType,
                    marginRight: 300,
                    marginBottom: 10
                },
                plotOptions: {
                    line: {connectNulls: true}
                },
                yAxis: {
                    title: {
                        text: ' '
                    }
                },

                xAxis: {
                    type: 'datetime'
                },

                legend: {
                    align: 'right',
                    verticalAlign: 'top',
                    x: -15,
                    y: 15,
                    borderWidth:0,
                    itemMarginBottom: 5,
                    width: 260,
                    layout: 'vertical'
                },

                series: (function() {

                    var series = [], formObj = null, days, formID;

                    var otherCount = 0;
                    var otherDays = {};
                    var totalEvents = formLeads.totalEvents;
                    var totalOther = 0;

                    var totalFormsIncluded = 0;
                    var totalFormsShown = 0;
                    var totalForms = _.keys(formLeads.forms).length;


                    for (var key in formLeads.forms) {

                        if (formLeads.forms.hasOwnProperty(key)) {

                            formObj = formLeads.forms[key];
                            formID = formObj.id;

                            if (formObj.cnt && totalEvents) {

                                totalFormsIncluded++;

                                // Group together Statistically Insignificant Forms
                                if (formObj.cnt / totalEvents < .02 && totalForms > 9) {

                                    otherCount++;
                                    for (day in formLeads.leads[formID]) {
                                        if (formLeads.leads[formID].hasOwnProperty(day)) {
                                            if (otherDays[day]) {
                                                otherDays[day] += formLeads.leads[formID][day];
                                            } else {
                                                otherDays[day] = formLeads.leads[formID][day];
                                            }
                                            totalOther += formLeads.leads[formID][day];
                                        }
                                    }

                                } else {

                                    totalFormsShown++;

                                    days = [], total = 0;
                                    for (day in formLeads.leads[formID]) {
                                        if (formLeads.leads[formID].hasOwnProperty(day)) {
                                            days.push([(new Date(day)).getTime(), formLeads.leads[formID][day]]);
                                            total += formLeads.leads[formID][day];
                                        }
                                    }

                                    series.push({
                                        name: formObj.formName,
                                        stack: t('contacts'),
                                        data: days,
                                        total: total
                                    });
                                }
                            }
                        }
                    }

                    if (otherCount) {
                        days = [], total = 0;
                        for (day in otherDays) {
                            if (otherDays.hasOwnProperty(day)) {
                                days.push([(new Date(day)).getTime(), otherDays[day]]);
                                total += otherDays[day];
                            }
                        }

                        series.push({
                            name: otherCount == totalFormsIncluded ? t('all_forms') : t('x_other', {x: otherCount}),
                            stack: t('contacts'),
                            data: days,
                            total: total,
                            color: colors.gray
                        });
                    }

                    return series;

                })()

            }, defaults);

            options.chart.marginBottom = 35;

            if (true || interval == 'month') {
                options.xAxis =  {
                    type: 'datetime',
                    dateTimeLabelFormats: { // don't display the dummy year
                        month: '%b'
                    },
                    tickInterval: 86400000 * 30

                };
            }

            return (new Highcharts.Chart(options));
        },


        // Call Center

        callsOverTime: function(renderTo, callsScheduled, callsAttended) {

            var startDate = (new Date(Date.parse(callsScheduled.startDate))).getTime();
            // console.warn(Date.parse(callsScheduled.startDate), Date.parse(callsAttended.startDate), startDate);

            var options = $.extend(true, {
                chart: {
                    renderTo: renderTo,
                    type: 'line'
                },

                title: {
                    text: ''
                },

                yAxis: {
                    min: 0,
                        allowDecimals: false,
                        title: {
                        text: 'Calls'
                    }
                },

                xAxis: {
                    type: 'datetime',
                    dateTimeLabelFormats: {
                        day: '%b %e'
                    }
                },

                tooltip: {
                    formatter: function() {
                        return '<b>' + Highcharts.dateFormat('%b %e', this.x) + '</b><br/>' +
                            this.series.name + ': ' + this.y;
                    }
                },

                series: [
                    {
                        name: 'Calls Scheduled',
                        data: callsScheduled.leads,
                        pointStart: startDate,
                        pointInterval: _.interval.day
                    },
                    {
                        name: 'Calls Attended',
                        data: callsAttended.leads,
                        pointStart: startDate,
                        pointInterval: _.interval.day
                    } ]
                }, defaults);

            return (new Highcharts.Chart(options));
        },

        /* List Members */
        listMembersOverTime: function(renderTo, chartType, aggregates, imports, startDate, endDate) {
            var totalsData = [];
            var addedData = [];
            var removedData = [];
            var importLines = [];

            var date = new Date(startDate);
            var i = 0;
            var strDate;
            do {
                strDate = date.format('yyyy-mm-dd');
                timeDate = date.getTime();
                if (aggregates[strDate]) {
                    totalsData.push([timeDate, Number(aggregates[strDate].totalMembers)]);
                    addedData.push([timeDate, Number(aggregates[strDate].membersAdded)]);
                    removedData.push([timeDate, Number(aggregates[strDate].membersRemoved)]);
                } else {
                    if (i > 0) {
                        totalsData.push([timeDate, totalsData[i - 1][1]]);
                    } else {
                        totalsData.push([timeDate, 0]);
                    }
                    addedData.push([timeDate, 0]);
                    removedData.push([timeDate, 0]);
                }
                i++;
                date.setDate(date.getDate() + 1);
            } while (date <= endDate);

            _.each(imports, function(i) {
                var date = new Date(i.createTimestamp);
                var label;
                if (i.displayName) {
                    label = t('automation_automationlist_chartlabel_importatxbyy', {x: date.format(), y: i.displayName});
                } else {
                    label = t('automation_automationlist_chartlabel_importatx', {x: date.format()});
                }

                importLines.push({
                    value: date.getTime(),
                    width: 2,
                    color: 'black',
                    label: {
                        text: label,
                        align: 'center',
                        rotation: 0,
                        y: -10
                    }
                });
            });

            var options = $.extend(true, {
                chart: {
                    renderTo: renderTo,
                    type: chartType
                },

                title: {
                    text: ''
                },

                yAxis: {
                    min: 0,
                    allowDecimals: false,
                    title: {
                        text: t('members')
                    }
                },

                xAxis: {
                    type: 'datetime',
                        dateTimeLabelFormats: {
                        day: '%b %e'
                    },
                    plotLines: importLines,
                    tickInterval: _.interval.day,
                    minTickInterval: _.interval.day
                },

                plotOptions: {
                    series: {
                        stacking: null
                    }
                },

                tooltip: {
                    formatter: function() {
                        return '<b>'+ Highcharts.dateFormat('%b %e', this.x) +'</b><br/>'+
                            this.series.name + ': '+ this.y;
                    }
                },

                series: [
                    {
                        name: t('automation_automationlist_chartlabel_totalmembers'),
                        data: totalsData,
                        pointStart: startDate,
                        pointInterval: _.interval.day
                    },
                    {
                        name: t('automation_automationlist_chartlabel_membersadded'),
                        data: addedData,
                        pointStart: startDate,
                        pointInterval: _.interval.day
                    },
                    {
                        name: t('automation_automationlist_chartlabel_membersremoved'),
                        data: removedData,
                        pointStart: startDate,
                        pointInterval: _.interval.day,
                        color: 'red'
                    }
                ]
            }, defaults);

            return (new Highcharts.Chart(options));
        },

        /* Progress Pie */

        progressDonut: function(renderTo, series, innerSeries) {

            var options = $.extend(true, {
                title: {
                    text: ''
                },
                chart: {
                    renderTo: renderTo,
                    type: 'pie',
                    plotShadow: false,
                    borderWidth: 0,
                    backgroundColor: 'transparent'
                },

                plotOptions: {
                    pie: {
                        borderColor: '#FFFFFF',
                        borderWidth: 5,
                        innerSize: '53%'
                    }
                },

                series: (function() {

                    var rungs = [];
                    rungs.push({data: series, innerSize: '50%', size: '95%'});

                    if (innerSeries) {
                        rungs.push({data: innerSeries, size: '64%'});
                    }

                    return rungs;
                })(),

                tooltip: {
                    enabled: false,
                    formatter: pieTooltipFormat
                }
            }, cleanDefaults);

            var chart = new Highcharts.Chart(options);

            return (chart);

        },

        personaStatsPie: function (renderTo, activePersonaID, stats) {
            var categories = [];
            var data = [];

            categories.push(stats[activePersonaID].name);
            data.push({
                y: Number(stats[activePersonaID].allPercent),
                color: colors.purple,
                drilldown: {
                    name: stats[activePersonaID].name,
                    categories: ['Leads', 'Contacts'],
                    data: [Number(stats[activePersonaID].leadPercent), Number(stats[activePersonaID].contactPercent)],
                    color: colors.purple
                }
            });

            for (var id in stats) {
                if (stats.hasOwnProperty(id) && id != activePersonaID) {
                    categories.push(stats[id].name);
                    data.push({
                        y: Number(stats[id].allPercent),
                        color: colors.darkgray,
                        drilldown: {
                            name: stats[id].name,
                            categories: ['Leads', 'Contacts'],
                            data: [Number(stats[id].leadPercent), Number(stats[id].contactPercent)],
                            color: colors.darkgray
                        }
                    });
                }
            }

            var personaData = [];
            var detailData = [];
            var dataLen = data.length;
            var drillDataLen, brightness, i, j;


            // Build the data arrays
            for (i = 0; i < dataLen; i += 1) {
                // add inner data
                personaData.push({
                    name: categories[i],
                    y: data[i].y,
                    color: data[i].color
                });

                // add outer data
                drillDataLen = data[i].drilldown.data.length;
                for (j = 0; j < drillDataLen; j += 1) {
                    brightness = 0.2 - (j / drillDataLen) / 5;
                    detailData.push({
                        name: data[i].drilldown.categories[j],
                        y: data[i].drilldown.data[j],
                        color: Highcharts.Color(data[i].color).brighten(brightness).get()
                    });
                }
            }

            // Create the chart
            $(renderTo).highcharts({
                chart: {
                    type: 'pie',
                    plotShadow: false,
                    borderWidth: 0,
                    backgroundColor: 'transparent',
                },
                title: {
                    text: null
                },
                exporting: {
                    enabled: false
                },
                plotOptions: {
                    pie: {
                        borderColor: '#FFFFFF',
                        borderWidth: 2,
                        innerSize: '70%'
                    }
                },
                credits: {
                    enabled: false
                },
                tooltip: {
                    formatter: pieTooltipPercentFormat
                },
                series: [{
                    name: 'Persona',
                    data: personaData,
                    size: '85%',
                    dataLabels: {
                        formatter: function () {
                            return null;//this.y > 5 ? _.number_format(this.y, 2) + '%' : null;
                        },
                        color: '#ffffff',
                        distance: -30
                    }
                }, {
                    name: 'Type',
                    data: detailData,
                    size: '100%',
                    innerSize: '85%',
                    dataLabels: {
                        formatter: function () {
                            // display only if larger than 1
                            return null;//return this.y > 1 ? _.number_format(this.y, 2) + '%' : null;
                        }
                    }
                }]
            });
        },

        utilizationStatsPie: function(options) {
            var renderTo = typeof options['renderTo'] !== 'undefined' ? options['renderTo'] : null;
            var score = typeof options['score'] !== 'undefined' ? options['score'] : 0;
            var title = typeof options['title'] !== 'undefined' ? options['title'] : '';
            var progressColor = typeof options['progressColor'] !== 'undefined' ? options['progressColor'] : '';
            var lackingColor = typeof options['lackingColor'] !== 'undefined' ? options['lackingColor'] : '';

            $(renderTo).highcharts({
                exporting: {
                    buttons: {
                        contextButton: {
                            enabled: false
                        }
                    }
                },
                chart: {
                    type: 'pie',
                    plotShadow: false,
                    borderWidth: 0,
                    backgroundColor: 'transparent',
                },
                title: {
                    text: null
                },
                plotOptions: {
                    pie: {
                        center: ["50%", "50%"],
                        innerSize: "75%",
                        tooltip: {
                            headerFormat: "",
                            pointFormat: "<span>{point.y}</span>",
                            valueSuffix: '%'
                        }
                    }
                },
                credits: {
                    enabled: false
                },
                series: [{
                    name: 'Percent',
                    colorByPoint: true,
                    dataLabels: {
                        formatter: function () {
                            return null;
                        }
                    },
                    data: [{
                        name: 'Progress',
                        color: progressColor,
                        y: score
                    }, {
                        name: 'Lacking',
                        color: lackingColor,
                        y: 100 - score
                    }]
                }]
            })
        }

    };

    var salesTooltipFormat = function() {
        return '<b>' + this.series.name + '</b><br/>' +
            this.x + ': ' + app.currency + _.number_format(this.y);
    };

    var pieTooltipFormat = function() {
        return '<b>' + this.point.name + '</b>: ' + _.number_format(this.point.y);
    };
    var pieTooltipPercentFormat = function() {
        return '<b>' + this.point.name + '</b>: ' + _.number_format(this.point.y) + '%';
    };
    var pieMoneyTooltipFormat = function() {
        return '<b>' + this.point.name + '</b>: ' + app.currency + _.number_format(this.point.y);
    };

    var hourlyTooltipFormat = function() {
        return [
            timestampToHourlyRange(this.x, true),
            '<br />',
            this.point.series.name,
            ': ',
            '<b>',
            this.y,
            '</b>'
        ].join('');
    };

    var timestampToHourlyRange = function(time, newLine) {
        if (isNaN(time)) {
            return '';
        }
        var start = new Date(time);
        var end = new Date(time + 60*60*1000);
        return [start.format('longDate'),
            (newLine ? '<br />' : ' '),
            start.format('h tt'),
            ' - ',
            end.format('h tt')
        ].join('');
    };

    // Defaults for Bar and Pie graphs
    var defaults = {
        chart: {
            marginTop: 30,
            marginBottom: 60,
            borderRadius: 3,
            borderWidth: 1,
            borderLeft: 0,
            boderRight: 0,
            borderColor: '#ddd',
            backgroundColor: '#fff'
        },
        legend: {
            borderWidth:0,
            itemMarginBottom: 5
        },
        plotOptions: {
            column: {
                stacking: 'normal'
            },
            line: {
                marker: { lineWidth: 2, radius:4, symbol: 'circle', fillColor: '#fff', lineColor: null}
            },
            area: {
                stacking: true,
                fillOpacity: 0.2,
                marker: { radius: 1, symbol: 'circle' }
            },
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: false,
                    connectorWidth: 0,
                    distance: 7
                }
            },
            series: {
                shadow: false
            }
        },
        yAxis: {
            min: 0,
            allowDecimals: false
        },
        credits: { enabled: false },
        exporting: {
            buttons: {
                contextButton: {
                    //symbol: 'url(/includes/img/highcharts/print.png)'
                }
            }
        },
        navigation: {
            buttonOptions: {
                theme: {
                    fill: '#f9f9f9',
                    'stroke-width': 1,
                    'stroke': '#ccc',
                    'states': {
                        hover: {
                            stroke: '#999',
                            fill: '#fff'
                        },
                        select: {
                            stroke: '#999',
                            fill: '#fff'
                        }
                    }
                }
            },
            menuStyle: {
                border: '1px solid #ccc',
                'border-radius': '5px',
                'box-shadow': 'none',
                'font-size': '14px',
                'top': '9px'
            },
            menuItemStyle: {
                padding: '5px 10px'
            },
            menuItemHoverStyle: {
                background: '#40acc3'
            }
        }
    };

    // Remove borders and just show the graph
    var cleanDefaults = {
        chart: {
            marginTop: 15,
            marginBottom: 0,
            borderRadius: 0,
            borderWidth: 0,
            padding: 15,
            borderColor: 'transparent',
            backgroundColor: 'transparent'
        },
        plotOptions: {
            column: {
                stacking: 'normal',
                borderWidth: 0,
                groupPadding: 0
            },
            line: {
                marker: { radius:2, symbol: 'circle' }
            },
            area: {
                stacking: true,
                fillOpacity: 0.2,
                marker: { radius:1, symbol: 'circle' }
            },
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                startAngle: 60,
                dataLabels: {
                    enabled: false,
                    connectorWidth: 0,
                    distance: 7
                }
            },
            series: {
                shadow: false,
                slicedOffset: 0
            }
        },
        credits: { enabled: false },
        exporting: { enabled: false }
    };

    window.ssCharts = ssCharts;
})();
