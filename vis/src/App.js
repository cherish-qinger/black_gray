import "./App.css";
import { useEffect } from "react";

// router
import { Routes, Route } from "react-router-dom";

// 引入自定义组件
import Layout from "./components/layout";
import InfoList from "./components/info-list"; // 分析团伙板块 - 展示团伙基本信息的列表
import CountsBar from "./components/counts-bar"; // 分析团伙板块 - 展示团伙内节点与边类型及对应数量的列表
import BulletChart from "./components/bullet-chart"; // 分析团伙板块 - 展示
import ArcDiagram from "./components/arc-diagram"; // 分析团伙板块 - 展示每种边的连线与数量
import DetailList from "./components/detail-list"; // 分析团伙板块 - 表格展示单条边和点的信息
import MainView from "./components/main-view";
import SubChartForceGraph from "./components/sub-chart-force-graph";
import SkeletonChart from "./components/skeleton-chart";
import ICClueChart from "./components/ic-clue-chart";
import DifChart from "./components/dif-chart";
import DataProcessChecker from "./components/dataProcessChecker/dataProcessChecker";
import SearchBar from "./components/search-bar";
import CombineTable from "./components/combine-table";
import IndustryStackChart from "./components/industry-stack-chart";
import ClueDense from "./components/clue-dense";
import CrutialPath from "./components/crutial-path";

// import SubChart from './components/sub-chart';n
// 引入问题一的自定义组件

function App() {
  return (
    <div className="App">
      <Routes>
        <Route key="layout" path="/" element={<Layout />} />
        {/* <Route
          key="subchartforcegraph"
          path="/subchartforcegraph"
          element={<SubChartForceGraph />}
        /> */}
        <Route
          key="skeletonchart"
          path="/skeletonchart"
          element={<SkeletonChart />}
        />
        <Route key="infolist" path="/infolist" element={<InfoList />} />
        <Route key="countsbar" path="/countsbar" element={<CountsBar />} />
        <Route
          key="bulletchart"
          path="/bulletchart"
          element={<BulletChart />}
        />
        <Route key="arcdiagram" path="/arcdiagram" element={<ArcDiagram />} />
        <Route
          key="iccluechart"
          path="/iccluechart"
          element={<ICClueChart />}
        />
        <Route key="difchart" path="/difchart" element={<DifChart />} />
        <Route key="mainview" path="/mainview" element={<MainView />} />
        <Route key="detaillist" path="/detaillist" element={<DetailList />} />
        <Route key="checker" path="/checker" element={<DataProcessChecker />} />
        <Route key="searchbar" path="/searchbar" element={<SearchBar />} />
        <Route
          key="combinetable"
          path="/combinetable"
          element={<CombineTable />}
        />
        <Route
          key="industrystackchart"
          path="/industrystackchart"
          element={<IndustryStackChart />}
        />
        <Route key="cluedense" path="/cluedense" element={<ClueDense />} />
        <Route
          key="crutialpath"
          path="/crutialpath"
          element={<CrutialPath />}
        />
      </Routes>
    </div>
  );
}

export default App;
