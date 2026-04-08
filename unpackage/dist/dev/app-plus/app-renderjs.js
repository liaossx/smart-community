var __renderjsModules={};

__renderjsModules.a9f75d12 = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <stdin>
  var stdin_exports = {};
  __export(stdin_exports, {
    default: () => stdin_default
  });
  var stdin_default = {
    data() {
      return {
        repairChart: null,
        complaintChart: null,
        workOrderChart: null,
        compareChart: null,
        // 缓存数据
        pendingRepairData: null,
        pendingComplaintData: null,
        pendingWorkOrderData: null,
        pendingCompareData: null
      };
    },
    mounted() {
      console.log("ECharts \u6A21\u5757\u5DF2\u6302\u8F7D");
      if (window.echarts) {
        this.initInstances();
      } else {
        this.initCharts();
      }
    },
    methods: {
      initCharts() {
        if (typeof window.echarts === "object") {
          this.initInstances();
          return;
        }
        const script = document.createElement("script");
        script.id = "echarts-script";
        script.src = "https://unpkg.com/echarts@5.4.3/dist/echarts.min.js";
        script.onload = () => this.initInstances();
        document.head.appendChild(script);
      },
      initInstances() {
        if (!window.echarts)
          return;
        const repairDom = document.getElementById("repairChart");
        if (repairDom)
          this.repairChart = window.echarts.init(repairDom);
        const complaintDom = document.getElementById("complaintChart");
        if (complaintDom)
          this.complaintChart = window.echarts.init(complaintDom);
        const workOrderDom = document.getElementById("workOrderChart");
        if (workOrderDom)
          this.workOrderChart = window.echarts.init(workOrderDom);
        const compareDom = document.getElementById("compareChart");
        if (compareDom)
          this.compareChart = window.echarts.init(compareDom);
        if (this.pendingRepairData)
          this.renderRepairChart(this.pendingRepairData);
        if (this.pendingComplaintData)
          this.renderComplaintChart(this.pendingComplaintData);
        if (this.pendingWorkOrderData)
          this.renderWorkOrderChart(this.pendingWorkOrderData);
        if (this.pendingCompareData)
          this.renderCompareChart(this.pendingCompareData);
      },
      updateRepairChart(newValue) {
        this.pendingRepairData = newValue;
        if (this.repairChart)
          this.renderRepairChart(newValue);
      },
      renderRepairChart(data) {
        if (!data || data.length === 0)
          return;
        const dates = data.map((item) => item.date);
        const counts = data.map((item) => item.count);
        this.repairChart.setOption({
          grid: { top: 30, bottom: 30, left: 40, right: 20, containLabel: true },
          tooltip: { trigger: "axis" },
          xAxis: { type: "category", data: dates },
          yAxis: { type: "value", minInterval: 1 },
          series: [{ data: counts, type: "line", smooth: true, areaStyle: { color: "rgba(132, 250, 176, 0.3)" }, itemStyle: { color: "#84fab0" } }]
        });
      },
      updateComplaintChart(newValue) {
        this.pendingComplaintData = newValue;
        if (this.complaintChart)
          this.renderComplaintChart(newValue);
      },
      renderComplaintChart(data) {
        if (!data || data.length === 0)
          return;
        this.complaintChart.setOption({
          tooltip: { trigger: "item" },
          legend: { bottom: "0%", left: "center" },
          series: [{ type: "pie", radius: ["40%", "70%"], data, itemStyle: { borderRadius: 10, borderColor: "#fff", borderWidth: 2 } }]
        });
      },
      // 新增：工单状态占比渲染
      updateWorkOrderChart(newValue) {
        this.pendingWorkOrderData = newValue;
        if (this.workOrderChart)
          this.renderWorkOrderChart(newValue);
      },
      renderWorkOrderChart(data) {
        if (!data || data.length === 0)
          return;
        const option = {
          backgroundColor: "#1a1a2e",
          // 深色系风格
          title: { text: "\u5DE5\u5355\u72B6\u6001\u5206\u5E03", left: "center", textStyle: { color: "#fff" } },
          tooltip: { trigger: "item" },
          legend: { bottom: "5%", left: "center", textStyle: { color: "#ccc" } },
          color: ["#4facfe", "#00f2fe", "#84fab0", "#a18cd1"],
          series: [{
            type: "pie",
            radius: ["40%", "65%"],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 8, borderColor: "#1a1a2e", borderWidth: 2 },
            label: { show: false, position: "center" },
            emphasis: { label: { show: true, fontSize: "18", fontWeight: "bold", color: "#fff" } },
            data
          }]
        };
        this.workOrderChart.setOption(option);
      },
      // 新增：报修与工单对比图渲染
      updateCompareChart(newValue) {
        this.pendingCompareData = newValue;
        if (this.compareChart)
          this.renderCompareChart(newValue);
      },
      renderCompareChart(data) {
        if (!data || !data.repair)
          return;
        const option = {
          backgroundColor: "#1a1a2e",
          // 深色系风格
          title: { text: "\u62A5\u4FEE\u4E0E\u5DE5\u5355\u5BF9\u6BD4", left: "center", textStyle: { color: "#fff" } },
          tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
          grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
          xAxis: [{ type: "category", data: ["\u603B\u91CF\u5BF9\u6BD4"], axisLine: { lineStyle: { color: "#ccc" } } }],
          yAxis: [{ type: "value", axisLine: { lineStyle: { color: "#ccc" } }, splitLine: { lineStyle: { color: "#333" } } }],
          series: [
            { name: "\u62A5\u4FEE\u603B\u6570", type: "bar", barWidth: "30%", data: [data.repair], itemStyle: { color: "#4facfe" } },
            { name: "\u5DF2\u8F6C\u5DE5\u5355", type: "bar", barWidth: "30%", data: [data.workorder], itemStyle: { color: "#84fab0" } }
          ]
        };
        this.compareChart.setOption(option);
      }
    }
  };
  return __toCommonJS(stdin_exports);
})();
