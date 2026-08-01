import React from "react";
import SideBar from "./SideBar";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Overview from "./Overview";
import Import from "./Import";
import Export from "./Export";
import AnalyzeSentiment from "./AnalyzeSentiment";
import AskAI from "./AskAI";
import Header from "./Header";
import datasetPath from "../data/ulasan_tokopedia.csv?url";

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      dataset: datasetPath,
    };
  }

  handleImport = (file) => {
    this.setState({ dataset: file });
  };

  render() {
    return (
      <div className="main-container">
        <BrowserRouter>
          <Header />
          <div className="content-container">
            <SideBar />

            <Routes>
              <Route path="/" element={<Overview dataset={this.state.dataset}/>} />
              <Route
                path="/Import"
                element={<Import onImport={this.handleImport} />}
              />
              <Route path="/Export" element={<Export dataset={this.state.dataset}/>} />
              <Route path="/AnalyzeSentiment" element={<AnalyzeSentiment />} />
              <Route path="/AskAI" element={<AskAI />} />
            </Routes>
          </div>
        </BrowserRouter>
      </div>
    );
  }
}

export default App;
