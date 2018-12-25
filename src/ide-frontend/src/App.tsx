import * as React from "react";

import AceEditor from "react-ace";
import Renderer from "react-renderer";
import { Grid, Cell } from "styled-css-grid";
import logo from "./icons/logo.svg";
import venn from "./icons/venn.svg";
import play from "./icons/play.svg";
import reload from "./icons/reload.svg";
import chevronDown from "./icons/chevron_down.svg";
import download from "./icons/download.svg";
import Log from "Log";
import Button from "Button";
import Dropdown, { IOption } from "Dropdown";
import { Menu, MenuList, MenuButton, MenuItem } from "@reach/menu-button";
import { Persist } from "react-persist";
import Alert from "@reach/alert";
import styled from "styled-components";
const socketAddress = "ws://localhost:9160";

/*
  DEBUG NOTES:
    If you don't want the localStorage to set text box contents,
    remove the <Persist> Element
*/

const MenuBtn = styled(MenuButton)`
  background: none;
  border: none;
  opacity: 0.8;
  transition: 0.2s;
  cursor: pointer;
  :hover {
    opacity: 1;
    transition: 0.2s;
  }
  :focus {
    outline: none;
    opacity: 1;
  }
`;

const SocketAlert = styled(Alert)`
  background-color: hsla(10, 50%, 50%, 0.3);
  padding: 0.5em;
  position: absolute;
  width: 100%;
  box-sizing: border-box;
`;
const ConvergedStatus = styled(Alert)`
  background: rgba(0, 0, 0, 0.07);
  padding: 0.5em;
  position: absolute;
  width: 100%;
`;
const ErrorContainer = styled.div`
  position: relative;
`;

const CodeError = styled(Alert)`
  background-color: hsla(202, 92%, 61%, 0.3);
  padding: 0.5em;
  width: inherit;
  position: sticky;
  bottom: 0;
  font-size: 1.2em;
`;

interface IState {
  code: string;
  initialCode: string;
  rendered: boolean;
  selectedElement: IOption;
  selectedStyle: IOption;
  debug: boolean;
  ready: boolean;
  socketError: string;
  codeError: string;
  converged: boolean;
}

const elementOptions = [
  { value: 0, label: "set theory", icon: venn },
  { value: 1, label: "linear algebra", icon: logo },
  { value: 2, label: "real analysis", icon: logo }
];

const styleOptions = [{ value: 0, label: "venn", icon: venn }];
class App extends React.Component<any, IState> {
  public state = {
    code: "AutoLabel All\n",
    initialCode: "AutoLabel All\n",
    rendered: false,
    selectedElement: elementOptions[0],
    selectedStyle: styleOptions[0],
    debug: false,
    ready: false,
    socketError: "",
    codeError: "",
    converged: true
  };
  public ws: any = null;
  public readonly renderer = React.createRef<Renderer>();
  constructor(props: any) {
    super(props);
    Log.info("Connecting to socket...");
    this.setupSockets();
  }
  public changedConverged = (converged: boolean) => {
    this.setState({ converged });
  };
  public download = () => {
    if (this.renderer.current !== null) {
      this.renderer.current.download();
    }
  };
  public autostep = async () => {
    if (this.renderer.current !== null) {
      await this.renderer.current.autoStepToggle();
      this.forceUpdate(); // force re-render of button state since own state remains the same
    }
  };
  public step = () => {
    if (this.renderer.current !== null) {
      this.renderer.current.step();
    }
  };
  public resample = () => {
    if (this.renderer.current !== null) {
      this.renderer.current.resample();
    }
  };
  public onSocketError = (e: any) => {
    this.setState({ socketError: "Error: could not connect to WebSocket." });
  };
  public clearSocketError = () => {
    this.setState({ socketError: "", ready: true });
  };
  public setupSockets = () => {
    this.ws = new WebSocket(socketAddress);
    this.ws.onopen = this.clearSocketError;
    this.ws.onmessage = this.onMessage;
    this.ws.onclose = (e: any) => {
      this.onSocketError(e);
      this.setupSockets();
    };
    this.ws.onerror = this.onSocketError;
  };
  public onMessage = (e: MessageEvent) => {
    if (this.renderer.current !== null) {
      const data = JSON.parse(e.data);
      const packetType = data.type;
      Log.info("Received data from the server.", data);
      if (packetType !== "error") {
        if (this.state.codeError !== "") {
          this.setState({ codeError: "" });
        }
        if (!this.state.rendered) {
          this.setState({ rendered: true });
        }
      }
      if (packetType === "error") {
        Log.error(data);
        this.setState({ codeError: data.contents.contents });
      } else if (packetType === "shapes") {
        this.renderer.current.onMessage(e);
      } else {
        Log.error(`Unknown packet type: ${packetType}`);
      }
    } else {
      Log.error("Renderer is null.");
    }
  };
  public compile = async () => {
    const packet = { tag: "Edit", contents: { program: this.state.code } };
    if (this.renderer.current !== null) {
      await this.renderer.current.turnOffAutostep();
    }
    this.ws.send(JSON.stringify(packet));
    this.setState({ initialCode: this.state.code });
  };
  public onChangeCode = (value: string) => {
    this.setState({ code: value });
  };
  public selectedElement = (value: IOption) => {
    this.setState({ selectedElement: value });
  };
  public selectedStyle = (value: IOption) => {
    this.setState({ selectedStyle: value });
  };
  public toggleDebug = () => {
    this.setState({ debug: !this.state.debug });
  };

  public render() {
    const {
      code,
      initialCode,
      rendered,
      selectedElement,
      selectedStyle,
      debug,
      socketError,
      codeError,
      ready,
      converged
    } = this.state;
    const autostepStatus = this.renderer.current
      ? this.renderer.current.state.autostep
      : false;
    return (
      <Grid
        style={{ height: "100vh", backgroundColor: "#EDF8FF" }}
        columns={2}
        rows={"minmax(70px, auto) 1fr "}
        gap="0"
        rowGap="0"
        columnGap={"5px"}
      >
        <Persist
          name="debugMode"
          data={debug}
          debounce={0}
          onMount={data => this.setState({ debug: data })}
        />
        <Persist
          name="savedContents"
          data={code}
          debounce={200}
          onMount={data => this.setState({ code: data })}
        />
        <Cell
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexDirection: "row",
            padding: "0 0.2em 0 0.5em"
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <Menu>
              <MenuBtn>
                <img src={logo} width={50} aria-labelledby="Main Menu" />
                <img src={chevronDown} />
              </MenuBtn>
              <MenuList>
                <MenuItem onSelect={this.toggleDebug}>
                  Turn {debug ? "off" : "on"} debug mode
                </MenuItem>
              </MenuList>
            </Menu>

            <Dropdown
              options={elementOptions}
              selected={selectedElement}
              onSelect={this.selectedElement}
            />
          </div>
          <Button
            label={"build"}
            leftIcon={play}
            onClick={this.compile}
            primary={true}
            disabled={!ready || code === initialCode}
          />
        </Cell>
        <Cell
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexDirection: "row",
            padding: "0 0.2em 0 0.5em"
          }}
        >
          <Dropdown
            options={styleOptions}
            selected={selectedStyle}
            onSelect={this.selectedStyle}
          />
          {debug && <Button label="step" onClick={this.step} />}
        </Cell>
        <Cell>
          <AceEditor
            width="100%"
            height="100%"
            style={{ zIndex: 0 }}
            fontSize={20}
            onChange={this.onChangeCode}
            value={code}
          />
          {codeError !== "" && <CodeError>{codeError}</CodeError>}
        </Cell>
        <Cell style={{ backgroundColor: "#FBFBFB" }}>
          <ErrorContainer>
            {socketError !== "" && <SocketAlert>{socketError}</SocketAlert>}

            {!converged && <ConvergedStatus>optimizing...</ConvergedStatus>}
          </ErrorContainer>

          <Renderer
            ws={this.ws}
            ref={this.renderer}
            customButtons={true}
            convergeStatus={this.changedConverged}
          />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Button
              label="resample"
              leftIcon={reload}
              onClick={this.resample}
              primary={true}
              disabled={!rendered}
            />
            <Button
              label={autostepStatus ? "autostep (on)" : "autostep (off)"}
              onClick={this.autostep}
            />
            <Button
              leftIcon={download}
              label="download"
              onClick={this.download}
              disabled={!rendered}
            />
          </div>
        </Cell>
      </Grid>
    );
  }
}

export default App;
