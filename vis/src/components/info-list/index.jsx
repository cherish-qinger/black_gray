import { Tag, Table } from "antd";
// import { getInfoListSds } from "../../apis/api";
import PubSub from "pubsub-js";

import "antd/dist/antd.css";
import { useEffect, useState } from "react";
import "./index.css";

export default function InfoList() {
  const [data, setData] = useState([]);
  const [dataParam, setDataParam] = useState(undefined);

  useEffect(() => {
    if (dataParam == undefined) return;
    setData([dataParam]);
  }, [dataParam]);

  PubSub.unsubscribe("fromMainToInfoList");
  PubSub.subscribe("fromMainToInfoList", function (msg, infoDt) {
    setDataParam(infoDt);
  });

  const colorList = [
    "#f9b4ae",
    "#b3cde3",
    "#ccebc5",
    "#decbe4",
    "#fbd9a6",
    "#feffcc",
    "#e5d8bd",
    "#fcdaec",
    "#f2f2f2",
  ];

  let industryColor = {
    A: "#ff9f6d",
    B: "#d88c9a",
    C: "#a17fda",
    D: "#c3e6a1",
    E: "#4caead",
    F: "#64d9d7",
    G: "#82b461",
    H: "#fffb96",
    I: "#87ccff",
    AB:"#4281a4",
    BC:"#9c89b8",
    ABCE:"#125B50",
    ABCEG:"#6ECB63",
    BC:"#7E8A97",
    ABC:"#c44536",
    AC:"#d88c9a",
    BG:"#B1BCE6",
    BI:"#00917C",
    BH:"#E4AEC5",
    AG:"#f9b4ae",
  };

  const columns = [
    {
      title: "节点数量",
      dataIndex: "numnode",
      key: "numnode",
    },
    {
      title: "边数量",
      dataIndex: "numlink",
      key: "numlink",
    },
    {
      title: "团伙规模",
      dataIndex: "groupscope",
      key: "groupscope",
    },
    {
      title: "产业类型与数量",
      dataIndex: "industrytype",
      key: "industrytype",
      render: (tags) => (
        <>
          {tags.map((tag, index) => {
            return (
              <Tag color={industryColor[tag.split('(')[0]]} key={tag}>
              {/* <Tag color={colorList[index]} key={tag}> */}
                {/* {tag.split(",")} */}
                {tag}
              </Tag>
            )
          })}
        </>
      ),
    },
    {
      title: "团伙类型",
      dataIndex: "grouptype",
      key: "grouptype",
    },
  ];

  return (
    <div id="infolist" style={{ width: "100%", height: "5.79vh" }}>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="numnode"
        size="small"
        pagination={false}
      ></Table>
    </div>
  );
}
