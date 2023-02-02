import { select as d3Select, pointer as d3Pointer } from "d3-selection";
import { scaleLinear } from "d3-scale";
import {
  hierarchy as d3Hierarchy,
  partition as d3Partition,
} from "d3-hierarchy";
import { transition as d3Transition } from "d3-transition";
import { interpolate as d3Interpolate } from "d3-interpolate";
import zoomable from "d3-zoomable";
import Kapsule from "kapsule";
import * as d3 from "d3";
import tinycolor from "tinycolor2";
import accessorFn from "accessor-fn";
import "./index.css";

const LABELS_WIDTH_OPACITY_SCALE = scaleLinear().domain([4, 8]).clamp(true); // px per char
const LABELS_HEIGHT_OPACITY_SCALE = scaleLinear().domain([15, 40]).clamp(true); // available height in px

var selectedIclcleNode = [];

export default Kapsule({
  props: {
    width: {
      default: window.innerWidth,
      onChange(_, state) {
        state.needsReparse = true;
      },
    },
    height: {
      default: window.innerHeight,
      onChange(_, state) {
        state.needsReparse = true;
      },
    },
    orientation: {
      default: "lr", // td, bu, lr, rl
      onChange: function (_, state) {
        this.zoomReset();
        state.needsReparse = true;
      },
    },
    data: {
      onChange: function () {
        this._parseData();
      },
    },
    children: {
      default: "children",
      onChange(_, state) {
        state.needsReparse = true;
      },
    },
    sort: {
      onChange(_, state) {
        state.needsReparse = true;
      },
    },
    label: { default: (d) => d.id.slice(0, 20) + "..." },
    size: {
      default: "value",
      onChange: function (_, state) {
        this.zoomReset();
        state.needsReparse = true;
      },
    },
    color: { default: (d) => "lightgrey" },
    nodeClassName: {}, // Additional css classes to add on each segment node
    minSegmentWidth: { default: 0.8 },
    excludeRoot: {
      default: false,
      onChange(_, state) {
        state.needsReparse = true;
      },
    },
    showLabels: { default: true },
    showTooltip: { default: (d) => true, triggerUpdate: false },
    tooltipTitle: { default: null, triggerUpdate: false },
    tooltipContent: { default: (d) => "", triggerUpdate: false },
    onClick: { triggerUpdate: false },
    onHover: { triggerUpdate: false },
    transitionDuration: { default: 800, triggerUpdate: false },
    divTop: { default: 0, triggerUpdate: false },
    divLeft: { default: -20, triggerUpdate: false },
  },
  methods: {
    zoomBy: function (state, k) {
      state.zoom.zoomBy(k, state.transitionDuration);
      return this;
    },
    zoomReset: function (state) {
      state.zoom.zoomReset(state.transitionDuration);
      return this;
    },
    zoomToNode: function (state, d = {}) {
      const node = d.__dataNode;
      if (node) {
        const horiz = state.orientation === "lr" || state.orientation === "rl";

        const scale = state[horiz ? "height" : "width"] / (node.x1 - node.x0);
        const tr = -node.x0;

        state.zoom.zoomTo(
          { x: horiz ? 0 : tr, y: horiz ? tr : 0, k: scale },
          state.transitionDuration
        );
      }
      return this;
    },
    _parseData: function (state) {
      if (state.data) {
        const hierData = d3Hierarchy(
          state.data,
          accessorFn(state.children)
        ).sum(accessorFn(state.size));

        if (state.sort) {
          hierData.sort(state.sort);
        }

        const horiz = state.orientation === "lr" || state.orientation === "rl";
        const size = [state.width, state.height];
        horiz && size.reverse();

        d3Partition()
          //.padding(1)
          //.round(true)
          .size(size)(hierData);

        hierData.descendants().forEach((d, i) => {
          d.id = i; // Mark each node with a unique ID
          d.data.__dataNode = d; // Dual-link data nodes
        });

        if (state.excludeRoot) {
          // re-scale y values if excluding root
          const yScale = scaleLinear()
            .domain([hierData.y1 - hierData.y0, size[1]])
            .range([0, size[1]]);

          hierData.descendants().forEach((d) => {
            d.y0 = yScale(d.y0);
            d.y1 = yScale(d.y1);
          });
        }
        state.layoutData = hierData.descendants().filter((d) => d.y0 >= 0);
      }
    },
    getSelectedIcicleNode: function () {
      //返回被选中的节点
      return selectedIclcleNode;
    },
    setSelectedIcicleNode: function () {   // 将选择的数据置空
      selectedIclcleNode = []
    }
  },
  stateInit: () => ({
    zoom: zoomable(),
  }),
  init: function (domNode, state) {
    const el = d3Select(domNode)
      .append("div")
      .attr("class", "icicle-viz")
      .style("padding-top", state.divTop + "px")
      .style("left", state.divLeft + "px")
      .style("width", state.width + 10 + "px");
    // const el = d3Select(domNode).attr("class", "icicle-viz")

    // state.titleSvg = el.append('svg').attr('class', 'icicleTitleSvg')
    state.svg = el.append("svg").attr("class", "icicleSvg");
    state.canvas = state.svg.append("g")
      .attr('transform', 'translate(0, 0)')

    // tooltips
    state.tooltip = el
      .append("div")
      .attr("class", "chart-tooltip icicle-tooltip");

    el.on("mousemove", function (ev) {
      const mousePos = d3Pointer(ev);
      state.tooltip
        .style("left", mousePos[0] + "px")
        .style("top", mousePos[1] + "px")
        .style(
          "transform",
          `translate(-${(mousePos[0] / state.width) * 100}%, 21px)`
        ); // adjust horizontal position to not exceed canvas boundaries
    });

    // zoom/pan
    state
      .zoom(state.svg)
      .svgEl(state.canvas)
      .onChange((tr, prevTr, duration) => {
        if (state.showLabels && !duration) {
          // Scale labels immediately if not animating
          const horiz =
            state.orientation === "lr" || state.orientation === "rl";
          const scale = 1 / tr.k;

          state.canvas
            .selectAll("text")
            .attr(
              "transform",
              horiz ? `scale(1, ${scale})` : `scale(${scale},1)`
            );
        }

        // Prevent using transitions when using mouse wheel to zoom
        state.skipTransitionsOnce = !duration;
        state._rerender();
      });

    state.svg
      .on("click", () => (state.onClick || this.zoomReset)(null)) // By default reset zoom when clicking on canvas
      .on("mouseover", () => state.onHover && state.onHover(null));
  },
  update: function (state) {
    if (state.needsReparse) {
      this._parseData();
      state.needsReparse = false;
    }

    state.svg
      .style("width", state.width + "px")
      .style("height", state.height + "px");

    //  var titleG = state.titleSvg
    //               .style('width', state.width + 'px')
    //               .style('height', 20 + 'px')
    //               .append('g')
    //               .attr('class', 'icicleTitleG')
    //               .attr('transform', 'translate(0, 10)')
    // titleG.selectAll('text')
    //   .data(['起点', '第一跳', '第二跳'])
    //   .join('text')
    //   .text(d => d)
    //   .attr('x', (d, i) => `${(state.width - 20)/6*(i*2+1)}`)
    //   .style('font-size', '12px')
    //   .style('font-weight', 'bolder')
    //   .style('line-height', 1)
    //   .attr("text-align","center")

    const horiz = state.orientation === "lr" || state.orientation === "rl";

    state.zoom
      .translateExtent([
        [0, 0],
        [state.width, state.height],
      ])
      .enableX(!horiz)
      .enableY(horiz);

    if (!state.layoutData) return;

    const zoomTr = state.zoom.current();

    const cell = state.canvas
      .selectAll(".node")
      .data(state.layoutData, (d) => d.id);

    const nameOf = accessorFn(state.label);
    const colorOf = accessorFn(state.color);
    const nodeClassNameOf = accessorFn(state.nodeClassName);

    const animate = !state.skipTransitionsOnce;
    state.skipTransitionsOnce = false;
    const transition = d3Transition().duration(
      animate ? state.transitionDuration : 0
    );

    const x0 = {
      td: (d) => d.x0,
      bu: (d) => d.x0,
      lr: (d) => d.y0,
      rl: (d) => state.width - d.y1,
    }[state.orientation];
    const x1 = {
      td: (d) => d.x1,
      bu: (d) => d.x1,
      lr: (d) => d.y1,
      rl: (d) => state.width - d.y0,
    }[state.orientation];
    const y0 = {
      td: (d) => d.y0,
      bu: (d) => state.height - d.y1,
      lr: (d) => d.x0,
      rl: (d) => d.x0,
    }[state.orientation];
    const y1 = {
      td: (d) => d.y1,
      bu: (d) => state.height - d.y0,
      lr: (d) => d.x1,
      rl: (d) => d.x1,
    }[state.orientation];

    // Exiting
    cell.exit().transition(transition).remove();

    // Entering
    const newCell = cell
      .enter()
      .append("g")
      .attr(
        "transform",
        (d) => `translate(
        ${x0(d) + (x1(d) - x0(d)) * (horiz ? 0 : 0.5)},
        ${y0(d) + (y1(d) - y0(d)) * (horiz ? 0.5 : 0)}
      )`
      );

    let color = d3.scaleOrdinal(d3.schemeCategory10);
    // 颜色映射分别的数量
    var pureDomainLinearColor = d3
      .scaleLinear()
      .domain([0, state.data["pureDomainNum"]])
      .range([0, 1]);
    var dirtyDomainLinearColor = d3
      .scaleLinear()
      .domain([0, state.data["dirtyDomainNum"]])
      .range([0, 1]);
    const pureDomainColorCompute = d3.interpolate("#65a48711", "#2978b4");
    const dirtyDomainColorCompute = d3.interpolate("#00000011", "#808080");
    // 宽度映射各自的数量
    var pureDomainLinearColor = d3
      .scaleLinear()
      .domain([0, state.data["pureDomainNum"]])
      .range([0, 1]);
    var dirtyDomainLinearColor = d3
      .scaleLinear()
      .domain([0, state.data["dirtyDomainNum"]])
      .range([0, 1]);
    let startNodeColor = { IP: "#33a02c", Cert: "#ff756a" };
    let newCellG = newCell.append("g");
    for (let i = 0; i < 3; i++) {
      newCellG
        .append("rect")
        .attr("id", (d) => `rect-${d.id}_${i}`)
        .attr("x", (d) => {
          let tx;
          if (i === 0) tx = 5;
          else if (i === 1) tx = `${x1(d) - x0(d) - 1}` / 3;
          else tx = (`${x1(d) - x0(d) - 1}` / 3) * 2;
          return tx;
        })
        .attr("numId", (d) => d.data.numId)
        .attr("fill", (d) => {
          if (!d.depth) return startNodeColor[d.data.id.split("_")[0]];
          if (
            i === 0 &&
            d.data.WhoisPhone == 0 &&
            d.data.WhoisName == 0 &&
            d.data.WhoisEmail == 0
          )
            return "#fbbf81"; // 没有whois信息
          else if (
            i === 0 &&
            (d.data.WhoisPhone != 0 ||
              d.data.WhoisName != 0 ||
              d.data.WhoisEmail != 0)
          )
            return "#f67f02"; // 有whois信息
          if (i === 2)
            return dirtyDomainColorCompute(
              dirtyDomainLinearColor(d.data.dirtyDomain)
            ); // 映射不纯净的Domain
          return pureDomainColorCompute(
            pureDomainLinearColor(d.data.pureDomain)
          ); // 映射纯净的Domian

          // if(i === 1) return dirtyDomainColorCompute(dirtyDomainLinearColor(d.data.dirtyDomain));   // 映射不纯净的Domain
          // return pureDomainColorCompute(pureDomainLinearColor(d.data.pureDomain))   // 映射纯净的Domian
        })
        .attr("width", (d) => {
          if (!d.depth) {
            if (i == 0) return 0;
            return `${x1(d) - x0(d) - 1}` / 3;
          }

          if (i === 0) return `${x1(d) - x0(d) - 1}` / 3 - 5;
          if (i === 1) return `${x1(d) - x0(d) - 1}` / 3;
          if (i === 2) return `${x1(d) - x0(d) - 1}` / 3;

          // return  i === 2 ? `${(x1(d) - x0(d)) - 1}`/3-10 : `${(x1(d) - x0(d)) - 1}`/3   // 不根据数量映射长度
        })
        .attr("height", (d) => {
          let height = 0;
          height = `${y1(d) - y0(d) - 1}` > 0 ? `${y1(d) - y0(d) - 1}` : 1;

          // height = y1(d) - y0(d);
          return height;
        })
        .attr("focusable", "true")
        .on("dblclick", function (event, d) { })
        .on("click", (ev, d) => {
          newCellG.selectAll("rect").attr("opacity", 1);
          ev.stopPropagation();
          (state.onClick || this.zoomToNode)(d.data);
        })
        .on("mouseover", function (ev, d) {
          ev.stopPropagation();
          state.onHover && state.onHover(d.data);
          state.tooltip.style(
            "display",
            state.showTooltip(d.data, d) ? "inline" : "none"
          );
          state.tooltip.html(`
          <div class="tooltip-title">
            ${state.tooltipTitle
              ? state.tooltipTitle(d.data, d)
              : getNodeStack(d)
                .slice(state.excludeRoot ? 1 : 0)
                .map((d) => nameOf(d.data))
                .join(" &rarr; ")
            }
          </div>
          ${state.tooltipContent(d.data, d)}
        `);
          // 显示与当前点相同的其他位置上的点
          let currNumId = d.data.numId;
          newCellG.selectAll("rect").attr("opacity", 0.5);
          newCellG
            .filter(function (event, d) {
              let cur = d3.select(this).select("rect").attr("numId");
              return currNumId == cur;
            })
            .selectAll("rect")
            .attr("opacity", 1);
        })
        .on("mouseout", function () {
          state.tooltip.style("display", "none");
          newCellG
            .selectAll("rect")
            // .attr('stroke', 'none')
            .attr("opacity", 1);
        })
        .on("contextmenu", function (event, d) {
          let currNumId = d.data.numId; // 当前选中节点的numId
          event.preventDefault(); // 阻止浏览器默认事件
          if (event.altKey) {    // 按下shift键
            if (!selectedIclcleNode.includes(currNumId)) {

              selectedIclcleNode.push(currNumId);
            }
            newCellG
              .filter(function (event, d) {
                let cur = d3.select(this).select("rect").attr("numId");   // 找到当前的numId对应的数据
                return currNumId == cur;
              })
              .selectAll("rect")
              .classed("selectedIclcle", true);
          }
          else if (!event.ctrlKey && !event.altKey) {
            if (d.depth === 0) {
              d3.selectAll('.icicleSvg rect').classed("selectedIclcle", true)   // 选中第0层，选中所有的数据
              d3.selectAll('.selectedIclcle').each((d, index) => {
                let eachNumId = d.data.numId
                if (!selectedIclcleNode.includes(eachNumId)) {
                  selectedIclcleNode.push(eachNumId);
                }
              });
              selectedIclcleNode = Array.from(new Set(selectedIclcleNode))
            } else if (d.depth === 1) {    // 选中第二层
              selectedIclcleNode.push(currNumId);

              d3.select(this).classed("selectedIclcle", true)
              let childrenNode = d3.select(this)._groups[0][0].__data__.children
              if (childrenNode != undefined) {
                childrenNode.forEach((d) => {
                  let eachNumId = d.data.numId
                  if (!selectedIclcleNode.includes(eachNumId)) {
                    selectedIclcleNode.push(eachNumId);
                  }
                })
              }
              console.log(childrenNode);
              selectedIclcleNode = Array.from(new Set(selectedIclcleNode))
              newCellG
                .filter(function (event, d) {
                  let cur = d3.select(this).select("rect").attr("numId");   // 找到当前的numId对应的数据
                  return selectedIclcleNode.includes(cur);
                })
                .selectAll("rect")
                .classed("selectedIclcle", true);
            } else {
              if (!selectedIclcleNode.includes(currNumId))
                selectedIclcleNode.push(currNumId);
              newCellG
                .filter(function (event, d) {
                  let cur = d3.select(this).select("rect").attr("numId");   // 找到当前的numId对应的数据
                  return currNumId == cur;
                })
                .selectAll("rect")
                .classed("selectedIclcle", true);
            }
          } else {
            // 按下Ctrl键不选中
            let temp = selectedIclcleNode.filter((d) => d != currNumId); // 过滤掉被删除的节点
            selectedIclcleNode = [...temp];
            newCellG
              .filter(function (event, d) {
                let cur = d3.select(this).select("rect").attr("numId");
                return currNumId == cur;
              })
              .selectAll("rect")
              .classed("selectedIclcle", false);
          }
        });
    }
    newCellG
      .filter((d) => d.children === undefined && d.data.isInFirst)
      .append("circle")
      .attr("cx", (d) => x1(d) - x0(d) - 1 + 5)
      .attr("cy", (d) => (y1(d) - y0(d)) / 3 + 20)
      .attr("r", 2)
      .attr("fill", "red")
      .attr("numId", (d) => d.data.numId)
      .attr("class", "circle-label")
      .on("mouseover", function (event, d) {
        // 显示出提示框
        state.tooltip.style(
          "display",
          state.showTooltip(d.data, d) ? "inline" : "none"
        );
        state.tooltip.html(`
                <div class="tooltip-title">
                  ${state.tooltipTitle
            ? state.tooltipTitle(d.data, d)
            : getNodeStack(d)
              .slice(state.excludeRoot ? 1 : 0)
              .map((d) => nameOf(d.data))
              .join(" &rarr; ")
          }
                </div>
                ${state.tooltipContent(d.data, d)}
              `);

        // 显示对应的条
        let currNumId = d.data.numId;
        newCellG.selectAll("rect").attr("opacity", 0.5);
        newCellG
          .filter(function (event, d) {
            let cur = d3.select(this).select("rect").attr("numId");
            return currNumId == cur;
          })
          .selectAll("rect")
          .attr("opacity", 1);
        // .attr('stroke', '#e81123')
      })
      .on("mouseout", function (event, d) {
        newCellG.selectAll("rect").attr("stroke", "none").attr("opacity", 1);
      });

    newCellG
      .append("g")
      .attr("class", "label-container")
      .attr(
        "transform",
        (d) => `translate(
          ${state.orientation === "lr"
            ? 4
            : state.orientation === "rl"
              ? x1(d) - x0(d) - 4
              : 0
          },
          ${(y1(d) - y0(d)) / 2}
        )`
      )
      .append("text")
      .attr("class", "path-label");

    // Entering + Updating
    const allCells = cell.merge(newCell);

    allCells.attr("class", (d) =>
      [
        "node",
        ...`${nodeClassNameOf(d.data) || ""}`
          .split(" ")
          .map((str) => str.trim()),
      ]
        .filter((s) => s)
        .join(" ")
    );

    allCells
      .transition(transition)
      .attr("transform", (d) => `translate(${x0(d)},${y0(d)})`);

    // allCells.select('rect').transition(transition)
    //   .attr('width', d => `${x1(d) - x0(d) - (horiz ? 1 : 0)}`/3)
    //   .attr('height', d => `${y1(d) - y0(d) - (horiz ? 0 : 1)}`)
    // .style('fill', d => colorOf(d.data, d.parent));

    allCells
      .select("g.label-container")
      // .style('display', state.showLabels ? null : 'none')
      .transition(transition)
      .attr(
        "transform",
        (d) => `translate(
          ${state.orientation === "lr"
            ? 4
            : state.orientation === "rl"
              ? x1(d) - x0(d) - 4
              : (x1(d) - x0(d)) / 2
          },
          ${(y1(d) - y0(d)) / 2}
        )`
      );

    if (state.showLabels) {
      // Update previous scale
      const prevK = state.prevK || 1;
      state.prevK = zoomTr.k;

      allCells
        .select("text.path-label")
        .classed(
          "light",
          (d) => !tinycolor(colorOf(d.data, d.parent)).isLight()
        )
        .style(
          "text-anchor",
          state.orientation === "lr"
            ? "start"
            : state.orientation === "rl"
              ? "end"
              : "middle"
        )
        .text((d) => {
          if (!d.depth) return;
          return nameOf(d.data);
        })
        .transition(transition)
        .style("opacity", (d) =>
          horiz
            ? LABELS_HEIGHT_OPACITY_SCALE((y1(d) - y0(d)) * zoomTr.k)
            : LABELS_WIDTH_OPACITY_SCALE(
              ((x1(d) - x0(d)) * zoomTr.k) / nameOf(d.data).length
            )
        )
        // Scale labels inversely proportional
        .attrTween("transform", function () {
          const kTr = d3Interpolate(prevK, zoomTr.k);

          return horiz
            ? (t) => `scale(1, ${1 / kTr(t)})`
            : (t) => `scale(${1 / kTr(t)}, 1)`;
        });

      // 保持点的尺寸
      allCells
        .select("circle.circle-label")
        .transition(transition)
        .style("opacity", 1)
        .attrTween("transform", function () {
          const kTr = d3Interpolate(prevK, zoomTr.k);
          return horiz
            ? (t) => `scale(1, ${1 / kTr(t)})`
            : (t) => `scale(${1 / kTr(t)}, 1)`;
        });
    }

    function getNodeStack(d) {
      const stack = [];
      let curNode = d;
      while (curNode) {
        stack.unshift(curNode);
        curNode = curNode.parent;
      }
      return stack;
    }
  },
});
