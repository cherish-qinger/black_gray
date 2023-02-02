import { useEffect, useState } from "react";
import BulletChart from "../bullet-chart";
import DetailList from "../detail-list";
import PubSub from "pubsub-js";
import "./index.css";
export default function CombineTable({ w, h, b }) {
  const [bcWidth, setBcWidth] = useState(0);
  const [bcHeight, setBcHeight] = useState(0);
  const [dlWidth, setDlWidth] = useState(0);
  const [dlHeight, setDlHeight] = useState(0);
  const [dataParam, setDataParam] = useState({ nodes: [], links: [] });
  const [bullteData, setBullteData] = useState([]);
  
  useEffect(() => {
    setBcWidth(
      document.getElementById("combine-table-bc-" + b).getBoundingClientRect()
        .width
    );
    setBcHeight(
      document.getElementById("combine-table-bc-" + b).getBoundingClientRect()
        .height
    );
    setDlWidth(
      document.getElementById("combine-table-dl-" + b).getBoundingClientRect()
        .width
    );
    setDlHeight(
      document.getElementById("combine-table-dl-" + b).getBoundingClientRect()
        .height
    );

  }, [w, h, b]);

  // 监听从主图来的数据
  if (b === "node") {
    PubSub.unsubscribe("combinedNodeTableDt");
    PubSub.subscribe("combinedNodeTableDt", (msg, combineTableDt) => {
      setBullteData(combineTableDt[1])
      setDataParam({ nodes: [...combineTableDt[0].nodes], links: [...combineTableDt[0].links] });
    });
  }
  if (b === "link") {
    PubSub.unsubscribe("combinedLinkTableDt");
    PubSub.subscribe("combinedLinkTableDt", (msg, combineTableDt) => {
      setBullteData(combineTableDt[1])
      setDataParam({ nodes: [...combineTableDt[0].nodes], links: [...combineTableDt[0].links] });
    });
  }

  return (
    <div id={"combine-table-" + b} style={{ width: w, height: h }}>
      <div id={"combine-table-bc-" + b}>
        <BulletChart
          w={bcWidth}
          h={bcHeight}
          divname={"combine-table-bc-" + b}
          dataparam={bullteData}
        />
      </div>
      <div id={"combine-table-dl-" + b}>
        <DetailList
          w={dlWidth}
          h={dlHeight}
          divname={"combine-table-dl-" + b}
          dataparam={dataParam}
        />
      </div>
    </div>
  );
}
