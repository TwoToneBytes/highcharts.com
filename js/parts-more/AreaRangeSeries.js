/* 
 * The AreaRangeSeries class
 * 
 */

/**
 * Extend the default options with map options
 */
defaultPlotOptions.arearange = merge(defaultPlotOptions.area, {
	lineWidth: 1, // docs - changed default value
	marker: null,
	threshold: null,
	tooltip: {
		pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.low}</b> - <b>{point.high}</b><br/>' 
	},
	trackByArea: true,
	dataLabels: {
		xLow: 0,
		xHigh: 0,
		yLow: 16,
		yHigh: -6		
	},
	shadow: false // docs - changed default
});

/**
 * Add the series type
 */
seriesTypes.arearange = Highcharts.extendClass(seriesTypes.area, {
	type: 'arearange',
	pointArrayMap: ['low', 'high'],
	toYData: function (point) {
		return [point.low, point.high];
	},
	pointValKey: 'low',
	
	/**
	 * Translate data points from raw values x and y to plotX and plotY
	 */
	translate: function () {
		var series = this,
			yAxis = series.yAxis;

		seriesTypes.area.prototype.translate.apply(series);

		// Set plotLow and plotHigh
		each(series.points, function (point) {
			
			if (point.y !== null) {
				point.plotLow = point.plotY;
				point.plotHigh = yAxis.translate(point.high, 0, 1, 0, 1);
			}
		});
	},
	
	/**
	 * Extend the line series' getSegmentPath method by applying the segment
	 * path to both lower and higher values of the range
	 */
	getSegmentPath: function (segment) {
		
		var highSegment = [],
			i = segment.length,
			baseGetSegmentPath = Series.prototype.getSegmentPath,
			point,
			linePath,
			lowerPath,
			higherPath;
			
		// Make a segment with plotX and plotY for the top values
		while (i--) {
			point = segment[i];
			highSegment.push({
				plotX: point.plotX,
				plotY: point.plotHigh
			});
		}
		
		// Get the paths
		lowerPath = baseGetSegmentPath.call(this, segment);
		higherPath = baseGetSegmentPath.call(this, highSegment);
		
		// Create a line on both top and bottom of the range
		linePath = [].concat(lowerPath, higherPath);
		
		// For the area path, we need to change the 'move' statement into 'lineTo' or 'curveTo'
		higherPath[0] = 'L'; // this probably doesn't work for spline			
		this.areaPath = this.areaPath.concat(lowerPath, higherPath);
		
		return linePath;
	},
	
	/**
	 * Extend the basic drawDataLabels method by running it for both lower and higher
	 * values.
	 */
	drawDataLabels: function () {
		
		var data = this.data,
			length = data.length,
			i,
			originalDataLabels = [],
			seriesProto = Series.prototype,
			dataLabelOptions = this.options.dataLabels,
			point,
			inverted = this.chart.inverted;
			
		if (dataLabelOptions.enabled || this._hasPointLabels) {
			
			// Step 1: set preliminary values for plotY and dataLabel and draw the upper labels
			i = length;
			while (i--) {
				point = data[i];
				
				// Set preliminary values
				point.y = point.high;
				point.plotY = point.plotHigh;
				
				// Store original data labels and set preliminary label objects to be picked up 
				// in the uber method
				originalDataLabels[i] = point.dataLabel;
				point.dataLabel = point.dataLabelUpper;
				
				// Set the default offset
				if (inverted) {
					dataLabelOptions.align = 'left';
					dataLabelOptions.x = dataLabelOptions.xHigh;								
				} else {
					dataLabelOptions.y = dataLabelOptions.yHigh;
				}
			}
			seriesProto.drawDataLabels.apply(this, arguments); // #1209
			
			// Step 2: reorganize and handle data labels for the lower values
			i = length;
			while (i--) {
				point = data[i];
				
				// Move the generated labels from step 1, and reassign the original data labels
				point.dataLabelUpper = point.dataLabel;
				point.dataLabel = originalDataLabels[i];
				
				// Reset values
				point.y = point.low;
				point.plotY = point.plotLow;
				
				// Set the default offset
				if (inverted) {
					dataLabelOptions.align = 'right';
					dataLabelOptions.x = dataLabelOptions.xLow;
				} else {
					dataLabelOptions.y = dataLabelOptions.yLow;
				}
			}
			seriesProto.drawDataLabels.apply(this, arguments);
		}
	
	},
	
	getSymbol: seriesTypes.column.prototype.getSymbol,
	
	drawPoints: noop
});