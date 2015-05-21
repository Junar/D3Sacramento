var junarDataModel = Backbone.Model.extend({
    defaults: {
        the_matrix: [],
        group_column: '', // column for grouping data //TODO must be multiple
        sum_columns: [], // column for sum data //TODO must be multiple
        x_axis: '',
        url: '',
    },
    updateMatrix: function(){
    	self = this;
    	var xhr = $.ajax({
    		method: 'GET',
            dataType: 'json',
    		url: self.get('url'), //a sample data from sacramento
    	});
    	xhr.done(function(data){
    		fix_data = self.parseData(data);
    		dim_data = self.dimensionData(fix_data);
    		self.set('the_matrix', dim_data);
    	});
    	xhr.fail(function(){
    		alert('Failed!');
    	});
    },
    /* takes the junar API format and transform data in regular JSON*/
    parseData: function(data){
    	var ret = []; //the return values
    	var fields = []; // each fields readed

    	var results = data.result;
    	if (results.fType != 'ARRAY') return false; //TODO check resources as NO-ARRAYs
    	results = results.fArray;
    	var cols = data.result.fCols;

    	c = 1; // every single data
    	f = 1; // field order (restarts at each row)
    	r = 0; // row order
    	ret[r] = {};
    	_.each(results, function(result){
    		if (c <= cols){
    			//TODO check for the result.fHeader=true
    			fields.push(result.fStr);
    		}
    		else {
    			ret[r][fields[f-1]] = result.fStr;
    			if (c % cols == 0) { r += 1; ret[r] = {}; f = 1; }
				else               { f += 1; }
    		}
    		c += 1;
    		
    	});
    	return ret;
    },
    /* takes a fixed regular Json and filter X_axis and dimensions (sum_columns)) */
    dimensionData: function(data){
    	self = this;
    	var x_axis = self.get('x_axis');
    	sum_cols = self.get('sum_columns');
    	group_col = self.get('group_column');
    	
    	var ret = []; 

        //first row is titles
    	var this_row = sum_cols.slice();
        this_row.unshift(x_axis);
        ret.push(this_row);

        // group data
        grouped = {};
        // detect and put cero for any series
        _.each(data, function(row){
            for (key in row) {
    			if (key == x_axis){
    				grouped[row[key]] = {};
    				for (c in sum_cols) {
                	    grouped[row[key]][sum_cols[c]] = 0;
                	    }
    			}
    		}
        });

    	_.each(data, function(row){
            for (key in row) {
    			if (sum_cols.indexOf(key) >= 0){
    			    grouped[row[x_axis]][key] += parseFloat(row[key]);
    			}
    		}
    	});
    	
    	for (g in grouped){
    	    elem = [];
    	    elem.push(g);
    	    for (c in sum_cols) {
    	        elem.push(grouped[g][sum_cols[c]])
    	    }
    	    ret.push(elem);
	    }
    	
    	return ret;
    },


});

var junarDataView = Backbone.View.extend({
	initialize: function() {
      this.listenTo(this.model, 'change:the_matrix', this.render);
    },
	el: '#d3Chart',
    render: function(){

        var data = this.model.get('the_matrix');

        var $el = this.$el.empty();


        data.shift();

        var margin = {top: 20, right: 20, bottom: 30, left: 80},
            width = $el.width() - margin.left - margin.right,
            height = $el.height() - margin.top - margin.bottom;

        var formatter = d3.format(',');
        var convertDate = function (string) {
            return new Date(string, 0);
        };

        var color = d3.scale.category10();

        var x = d3.time.scale()
            .range([0, width])
            .domain(d3.extent(data, function (d) {
                return convertDate(d[0]);
            }));

        var y = d3.scale.linear()
            .range([height, 0])
            .domain([0,d3.max(data,function(d){return d3.sum(d,function(d,i){return i==0?0:d})})]);


        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left")
            .tickSize(-width);


        var area = d3.svg.area()
            .x(function (d) {
                return x(d.x);
            })
            .y0(function (d) {
                return y(d.y0);
            })
            .y1(function (d) {
                return y(d.y0 + d.y);
            });

        var stack = d3.layout.stack()
            .values(function (d) {
                return d.values;
            });

        var svg = d3.select($el.get(0)).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .style('overflow', 'visible')
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr('x', -(height / 2))
            .attr("y", -margin.left)
            .attr("dy", ".8em")
            .style("text-anchor", "middle")
            .text("Budget Amount");

        var g = svg.append('g');

        var sectores = function (ids) {
            var result = [];

            for (var i = 1; i < data[0].length; i++){
                result.push({
                    id: i,
                    values: data.map(function(d){
                        return {x: convertDate(d[0]), y:d[i]}
                    })
                });
            }

            return stack(result);


        };

        var stackedData;
        var update = function () {
            stackedData = sectores();

            var paths = g.selectAll(".sector")
                .data(stackedData);

            paths.enter().append('path');

            paths.attr('class', 'sector')
                .transition()
                .attr("d", function (d) {
                    return area(d.values);
                })
                .attr('fill', function (d) {
                    return color(d.id)
                })
                .attr('fill-opacity', 0.8);

            paths.exit().remove();
        }

        update();




        var focus = svg.append("g")
            .attr("class", "focus")
            .style("display", "none");

        focus.append("circle")
            .attr("r", 6)
            .style('fill-opacity', 0.5);

        focus.append('rect')
            .attr('fill', '#333')
            .attr('width', 180)
            .attr('height', 25)
            .attr('x', -90)
            .attr('y', -38);

        focus.append("text")
            .attr('fill', '#fff')
            .attr('text-anchor', 'middle')
            .attr("y", -20);

        svg.append("rect")
            .attr("class", "overlay")
            .attr("width", width)
            .attr("height", height)
            .style('fill', 'none')
            .style('pointer-events', 'all')
            .on("mouseover", function () {
                focus.style("display", null);
            })
            .on("mouseout", function () {
                focus.style("display", "none");
            })
            .on("mousemove", mousemove);

        function mousemove() {

            var x0 = d3.mouse(this)[0];
            var y0 = d3.mouse(this)[1];
            var minDistance = Number.MAX_VALUE;
            var d = null;

            for (var i in stackedData) {
                for (var j in stackedData[i].values) {
                    var distance = Math.pow(x0 - x(stackedData[i].values[j].x), 2) + Math.pow(y0 - y(stackedData[i].values[j].y0 + stackedData[i].values[j].y), 2);
                    if (distance <= Math.pow(80, 2) && distance < minDistance) {
                        minDistance = distance;
                        d = stackedData[i].values[j];
                    }
                }
            }

            if (d) {
                focus.style("display", null);
                focus.attr("transform", "translate(" + x(d.x) + "," + y(d.y0 + d.y) + ")");
                focus.select("text").text(formatter(d.y0 + d.y) + ' Budget Amount - ' + d.x.getFullYear());
            } else {
                focus.style("display", "none");
            }

        }
    }
});