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
		this.$el.html('He cambiado a <pre>' + JSON.stringify(this.model.get('the_matrix'), null, 2) + '</pre>');
	}
});