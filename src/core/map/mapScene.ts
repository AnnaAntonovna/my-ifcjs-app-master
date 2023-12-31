import * as OBC from "openbim-components";
import { Building, GisParameters, LngLat } from "../../types";
import * as MAPBOX from 'mapbox-gl';
import { DirectionalLight } from "three";
import { MAPBOX_KEY } from "../../secret";
import { User } from "firebase/auth";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";

export class MapScene {
  private components = new OBC.Components();
  private readonly style = "mapbox://styles/mapbox/light-v10";
  private map: MAPBOX.Map;
  private center: LngLat = { lat: 0, lng: 0 };
  private clickedCoordinates: LngLat = { lat: 0, lng: 0 };
  private labels: { [id: string]: CSS2DObject } = {};

  constructor(container: HTMLDivElement) {
    const configuration = this.getConfig(container);
    this.map = this.createMap(configuration);
    this.initializeComponents(configuration);
    this.setupScene();
  }

  dispose() {
    //try {
    if (this.components) {
      this.components.dispose();
      (this.map as any) = null;
      (this.components as any) = null;
      for (const id in this.labels) {
        const label = this.labels[id];
        label.removeFromParent();
        label.element.remove();
      }
      this.labels = {};
    }
    //} catch (error) {
    //  console.log(error);
    //}
  }

  private setupScene() {
    const scene = this.components.scene.get();
    scene.background = null;
    const dirLight1 = new DirectionalLight(0xffffff);
    dirLight1.position.set(0, -70, 100).normalize();
    scene.add(dirLight1);

    const dirLight2 = new DirectionalLight(0xffffff);
    dirLight2.position.set(0, 70, 100).normalize();
    scene.add(dirLight2);
  }

  private initializeComponents(config: GisParameters) {
    this.components.scene = new OBC.SimpleScene(this.components);
    this.components.camera = new OBC.MapboxCamera();
    this.components.renderer = this.createRenderer(config);
    //this.components.raycaster = new OBC.SimpleRaycaster(this.components);
    try {
    this.components.init();
    } catch (error) {
      console.log(error);
    }
  }

  private createRenderer(config: GisParameters) {
    const coords = this.getCoordinates(config);
    return new OBC.MapboxRenderer(this.components, this.map, coords);
  }

  private getCoordinates(config: GisParameters) {
    const merc = MAPBOX.MercatorCoordinate;
    return merc.fromLngLat(config.center, 0);
  }

  private createMap(config: GisParameters) {
    const map = new MAPBOX.Map({
      ...config,
      style: this.style,
      antialias: true,
    });

    map.on("contextmenu", this.storeMousePosition);

    return map;
  }

  private storeMousePosition = (event: MAPBOX.MapMouseEvent) => {
    this.clickedCoordinates = { ...event.lngLat };
  };

  addBuilding(user: User) {
    const { lat, lng } = this.clickedCoordinates;
    const userID = user.uid;
    const building = { userID, lat, lng, uid: "" };
    this.addToScene([building]);
  }

  private addToScene(buildings: Building[]) {
    for (const building of buildings) {
      const { uid, lng, lat } = building;

      const htmlElement = this.createHtmlElement();
      const label = new CSS2DObject(htmlElement);

      const center = MAPBOX.MercatorCoordinate.fromLngLat(
        { ...this.center },
        0
      );

      const units = center.meterInMercatorCoordinateUnits();

      const model = MAPBOX.MercatorCoordinate.fromLngLat({ lng, lat }, 0);

      model.x /= units;
      model.y /= units;
      center.x /= units;
      center.y /= units;

      label.position.set(model.x - center.x, 0, model.y - center.y);

      console.log("Center: ", center);
      console.log("Units: ", units);
      console.log("Model: ", model);
      console.log("HTMLElement: ", htmlElement);
      console.log("Label: ", label);
      console.log("Label position: ", label.position);
      console.log("Scene: ", this.components.scene);

      if (this.components && this.components.scene) {
        try {
          console.log("Before adding labels");
          this.components.scene.get().add(label);
          console.log("After adding labels");
        } catch (error) {
          console.log(error);
        }
      } else {
        console.error(
          "Components or components.scene are not properly initialized."
        );
      }

      this.labels[uid] = label;
      console.log("Div placed!");
    }
  }

  private createHtmlElement() {
    const div = document.createElement("div");
    div.textContent = "🏛️";
    div.classList.add("thumbnail");
    console.log("Div created!");
    return div;
  }

  private getConfig(container: HTMLDivElement) {
    const center = [9.239539615899416, 45.46235831229755] as [number, number];
    this.center = { lng: center[0], lat: center[1] };

    return {
      container,
      accessToken: MAPBOX_KEY, ////HERES A CATCH
      zoom: 15,
      pitch: 60,
      bearing: -40,
      center,
      buildings: [],
    };
  }
}
