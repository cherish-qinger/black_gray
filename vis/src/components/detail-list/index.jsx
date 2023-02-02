import * as d3 from "d3";
import "./index.css";
import { table } from "@observablehq/inputs";
import { useEffect, useState } from "react";
import { html } from "htl";
import PubSub from "pubsub-js";

// import { getDetialListSds } from "../../apis/api.js";

let nodeColumns = [
  "numId",
  "type",
  "industry",
  "isCore",
  "r_cert_chain",
  "r_cert",
  "r_whois_name",
  "r_whois_phone",
  "r_whois_email",
  "r_cname",
  "r_request_jump",
  "r_subdomain",
  "r_dns_a",
  "r_cidr",
  "r_asn",
  "id",
  "name",
];

let linkColumns = ["relation", "isCore", "source", "target"];

var nodeTable, linkTable;
export default function DetailList({ w, h, divname, dataparam }) {
  const [nodeData, setNodeData] = useState([]);
  const [linkData, setLinkData] = useState([]);

  const [svgWidth, setSvgWidth] = useState(w);
  const [svgHeight, setSvgHeight] = useState(h);
  const [selectionNode, setSelectionNode] = useState([]);
  const [selectionLink, setSelectionLink] = useState([]);
  const [dataParam, setDataParam] = useState(dataparam);

  // 随系统缩放修改画布大小
  useEffect(() => {
    setSvgWidth(w);
  }, [w]);
  useEffect(() => {
    setSvgHeight(h);
  }, [h]);

  useEffect(() => {
    setNodeData(dataparam.nodes);
    setLinkData(dataparam.links);
  }, [dataparam]);

  useEffect(() => {
    PubSub.publish("tableToMainNodeDt", selectionNode);
  }, [selectionNode]);

  useEffect(() => {
    PubSub.publish("tableToMainLinkDt", selectionLink);
  }, [selectionLink]);

  useEffect(() => {
    const dimensions = {
      width: svgWidth,
      height: svgHeight,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
    };
    const boundedWidth =
      dimensions.width - dimensions.margin.left - dimensions.margin.right;
    const boundedHeight =
      dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

    d3.selectAll(`div#${divname} g`).remove();
    const g = d3
      .select(`#${divname}`)
      .append("g")
      .attr("width", boundedWidth)
      .attr("height", boundedHeight)
      .attr("viewBox", [0, 0, boundedWidth, boundedHeight])
      .style("max-width", "100%")
      .style("background", "#aaa")
      .style(
        "transform",
        `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
      );
    if (divname === "combine-table-dl-node") {
      g.append(() => {
        nodeTable = table(nodeData, {
          rows: Infinity,
          required: false,
          columns: nodeColumns,
          format: {
            r_cert_chain: sparkbar(d3.max(nodeData, (d) => d.r_cert_chain)),
            r_cert: sparkbar(d3.max(nodeData, (d) => d.r_cert)),
            r_whois_name: sparkbar(d3.max(nodeData, (d) => d.r_whois_name)),
            r_whois_phone: sparkbar(d3.max(nodeData, (d) => d.r_whois_phone)),
            r_whois_email: sparkbar(d3.max(nodeData, (d) => d.r_whois_email)),
            r_cname: sparkbar(d3.max(nodeData, (d) => d.r_cname)),
            r_request_jump: sparkbar(d3.max(nodeData, (d) => d.r_request_jump)),
            r_subdomain: sparkbar(d3.max(nodeData, (d) => d.r_subdomain)),
            r_dns_a: sparkbar(d3.max(nodeData, (d) => d.r_dns_a)),
            r_cidr: sparkbar(d3.max(nodeData, (d) => d.r_cidr)),
            r_asn: sparkbar(d3.max(nodeData, (d) => d.r_asn)),
            isCore: tfbar(),
          },
          maxWidth: svgWidth,
          maxHeight: svgHeight,
        });
        return nodeTable;
      });
      nodeTable.addEventListener("click", (event) => {
        // 增加元素
        if (event.target.nodeName === "INPUT" && event.target.checked) {
          let curNumId = parseInt(
            event.path[2].cells[1].innerHTML.replaceAll(",", "")
          ); // 将html的numId转换为int类型
          if (!isNaN(curNumId)) {
            setSelectionNode((selectionNode) =>
              Array.from(new Set([...selectionNode, curNumId]))
            );
          }
        }
        // 删除元素
        if (event.target.nodeName === "INPUT" && !event.target.checked) {
          let curNumId = parseInt(
            event.path[2].cells[1].innerHTML.replaceAll(",", "")
          );
          if (!isNaN(curNumId)) {
            setSelectionNode((selectionNode) =>
              selectionNode.filter((d) => d !== curNumId)
            );
          } else {
            setSelectionNode([]);
          }
        }
      });

      // 下载事件
      nodeTable.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        downloadRes("node");
      });
    } else if (divname === "combine-table-dl-link") {
      g.append(() => {
        linkTable = table(linkData, {
          rows: Infinity,
          required: false,
          columns: linkColumns,
          format: {
            isCore: tfbar(),
          },
          maxWidth: svgWidth,
          maxHeight: svgHeight,
        });
        return linkTable;
      });
      linkTable.addEventListener("click", (event) => {
        // 增加元素
        if (event.target.nodeName === "INPUT" && event.target.checked) {
          let curSource = event.path[2].cells[3].innerHTML;
          let curTarget = event.path[2].cells[4].innerHTML;
          let curPair = curSource + "-" + curTarget;
          if (curPair != "<span></span>source-<span></span>target") {
            setSelectionLink((selectionLink) =>
              Array.from(new Set([...selectionLink, curPair]))
            );
          }
        }
        // 删除元素
        if (event.target.nodeName === "INPUT" && !event.target.checked) {
          let curSource = event.path[2].cells[3].innerHTML;
          let curTarget = event.path[2].cells[4].innerHTML;
          let curPair = curSource + "-" + curTarget;
          if (curPair != "<span></span>source-<span></span>target") {
            setSelectionLink((selectionLink) =>
              selectionLink.filter((d) => d !== curPair)
            );
          } else {
            setSelectionLink([]);
          }
        }

        // 下载表格数据
        linkTable.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          downloadRes("link");
        });
      });
    }
  }, [nodeData, linkData, svgWidth, svgHeight]);

  function tfbar() {
    // true/false的div，将true加粗
    return (x) => html`<div
      style="
      font-weight: ${x ? "bolder" : "normal"};
      width: "100%";
      >
      ${x.toLocaleString("en")}
    </div>`;
  }

  function downloadRes(type) {
    const tNodeHeader = "id,name,type,industry,isCore,";
    var nodeFilter = ["id", "name", "type", "industry", "isCore"];
    const tLinkHeader = "relation,source,target,isCore,";
    var linkFilter = ["relation", "source", "target", "isCore"];
    // 保存节点信息
    if (type === "node") {
      let nodeCsvString = tNodeHeader;
      nodeCsvString += "\r\n";
      nodeData.forEach((item) => {
        nodeFilter.forEach((key) => {
          let value = item[key];
          if (key === "industry") {
            let valueArr;
            if (value === "  ") {
              valueArr = "[]";
            } else {
              valueArr = '"[' + value.split("").toString() + ']"';
            }
            nodeCsvString += valueArr + ",";
          } else {
            nodeCsvString += value + ",";
          }
        });
        nodeCsvString += "\r\n";
      });
      nodeCsvString =
        "data:text/csv;charset=utf-8,\ufeff" +
        encodeURIComponent(nodeCsvString);
      let nodeLink = document.createElement("a");
      nodeLink.href = nodeCsvString;
      nodeLink.download = "节点.csv";
      document.body.appendChild(nodeLink);
      nodeLink.click();
      document.body.removeChild(nodeLink);
    }

    // 保存边的信息
    else if (type === "link") {
      let linkCsvString = tLinkHeader;
      linkCsvString += "\r\n";
      linkData.forEach((item) => {
        linkFilter.forEach((key) => {
          let value = item[key];
          linkCsvString += value + ",";
        });
        linkCsvString += "\r\n";
      });
      linkCsvString =
        "data:text/csv;charset=utf-8,\ufeff" +
        encodeURIComponent(linkCsvString);
      let linkLink = document.createElement("a");
      linkLink.href = linkCsvString;
      linkLink.download = "边.csv";
      document.body.appendChild(linkLink);
      linkLink.click();
      document.body.removeChild(linkLink);
    }
  }

  function sparkbar(max) {
    // max为0时，设置为1，避免计算div宽度百分比时除以0
    if (max === 0) {
      max = 1;
    }
    max = Math.sqrt(max); // 平滑数据区间变化

    let colorScale = d3.scaleSequential([0, max], d3.interpolateBlues);
    return (x) => html`<div
      style="
      background: ${colorScale(Math.sqrt(x))};
      width: ${(100 * Math.sqrt(x)) / max}%;
      float: left;
      padding-left: 3px;
      box-sizing: border-box;
      overflow: visible;
      display: flex;
      justify-content: end;"
    >
      ${x.toLocaleString("en")}
    </div>`;
  }
  return <></>;
}
