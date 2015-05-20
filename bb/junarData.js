var junarDataModel = Backbone.Model.extend({
    defaults: {
        the_matrix: {},
    },
    updateMatrix: function(){
    	self = this;
    	var xhr = $.ajax({
    		method: 'GET',
    		url: 'data/TRAFF-COUNT.json', //a sample data from sacramento
    	});
    	xhr.done(function(data){
    		self.set('the_matrix', data);
    	});
    	xhr.fail(function(){
    		alert('Failed!');
    	});
    },


});

var junarDataView = Backbone.View.extend({
	initialize: function() {
      this.listenTo(this.model, 'change:the_matrix', this.render);
    },
	el: '#d3Chart',
	render: function(){
		this.$el.html('He cambiado a ' + JSON.stringify(this.model.get('the_matrix')));
	}
});