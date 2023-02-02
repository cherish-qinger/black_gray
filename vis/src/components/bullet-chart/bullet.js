import * as d3 from "d3";

export default function bullet() {
  // Chart design based on the recommendations of Stephen Few. Implementation
  // based on the work of Clint Ivy, Jamie Love, and Jason Davies.
  // http://projects.instantcognition.com/protovis/bulletchart/
  // https://bl.ocks.org/mbostock/4061961
  // d3.bullet = function () {
  var orient = "left", // TODO top & bottom
    reverse = false,
    duration = 0,
    markers = bulletMarkers,
    measures = bulletMeasures,
    width = 30,
    height = 580,
    tickFormat = null,
    maxNum = 260,
    minNum = 0;

  // For each small multiple…
  function bullet(g) {
    g.each(function (d, i) {
      // var markerz = markers.call(this, d, i).slice().sort(d3.descending),
      //   measurez = measures.call(this, d, i).slice().sort(d3.descending),
      //   g = d3.select(this);

      var markerz = markers.call(this, d, i).slice();
      var measurez = measures.call(this, d, i).slice();
      var g = d3.select(this);

      var x1 = d3
        .scaleLinear()
        .domain([0, maxNum + 10])
        .range([0, height]);

      // Stash the new scale.
      this.__chart__ = x1;

      // Derive width-scales from the x-scales.
      var w0 = bulletWidth(x1);

      // Update the range rects.
      var range = g.selectAll("rect.range").data(measurez);

      range
        .enter()
        .append("rect")
        .attr("class", function (d, i) {
          return "range s" + i;
        })
        .attr("width", width)
        .attr("height", height)
        .attr("x", reverse ? x1 : 0)
        .attr("fill", "#eee");

      // Update the measure rects.
      var measure = g.selectAll("rect.measure").data(measurez);

      measure
        .enter()
        .append("rect")
        .attr("class", function (d, i) {
          return "measure s" + i;
        })
        .attr("width", width * 0.8)
        .attr("height", (d, i) => {
          // console.log(d, w0(d));
          return w0(d);
        })
        .attr("y", (d, i) => height - w0(d))
        .attr("x", width * 0.1)
        .attr("fill", (d, i) => {
          if (d > markerz) return "#f9b4ae";
          else return "#b3cde3";
        });

      var measure_text = g.selectAll("text.measure").data(measurez);
      measure_text
        .enter()
        .append("text")
        .attr("class", "numtext")
        .attr("transform", (d, i) => {
          return `translate(${width * 0.35},${height - w0(d) - 5})`;
        })
        .text((d) => d);

      // Update the marker lines.
      var marker = g.selectAll("line.marker").data(markerz);

      marker
        .enter()
        .append("line")
        .attr("class", "marker")
        .attr("x1", width / 6)
        .attr("x2", (width * 5) / 6)
        .attr("y1", (d, i) => height - w0(d))
        .attr("y2", (d, i) => height - w0(d));
    });
    d3.timerFlush();
  }

  // left, right, top, bottom
  bullet.orient = function (x) {
    if (!arguments.length) return orient;
    orient = x;
    reverse = orient == "right" || orient == "bottom";
    return bullet;
  };

  // markers (previous, goal)
  bullet.markers = function (x) {
    if (!arguments.length) return markers;
    markers = x;
    return bullet;
  };

  // measures (actual, forecast)
  bullet.measures = function (x) {
    if (!arguments.length) return measures;
    measures = x;
    return bullet;
  };

  bullet.width = function (x) {
    if (!arguments.length) return width;
    width = x;
    return bullet;
  };

  bullet.height = function (x) {
    if (!arguments.length) return height;
    height = x;
    return bullet;
  };

  bullet.maxNum = function (x) {
    if (!arguments.length) return maxNum;
    maxNum = x;
    return bullet;
  };

  bullet.minNum = function (x) {
    if (!arguments.length) return minNum;
    minNum = x;
    return bullet;
  };

  bullet.tickFormat = function (x) {
    if (!arguments.length) return tickFormat;
    tickFormat = x;
    return bullet;
  };

  bullet.duration = function (x) {
    if (!arguments.length) return duration;
    duration = x;
    return bullet;
  };

  return bullet;
}

function bulletMarkers(d) {
  return d.markers;
}

function bulletMeasures(d) {
  return d.measures;
}

function bulletWidth(x) {
  var x0 = x(0);
  return function (d) {
    return Math.abs(x(d) - x0);
  };
}
