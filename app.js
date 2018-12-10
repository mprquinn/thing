const radians = degrees => {
  return (degrees * Math.PI) / 180;
};

const distance = (x1, y1, x2, y2) => {
  return Math.sqrt(Math.pow(x1 - x2), 2) + Math.pow(y1 - y2, 2);
};

const map = (value, start1, stop1, start2, stop2) => {
  return ((value - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
};

class Box {
  constructor() {
    this.geom = new THREE.BoxGeometry(0.5, 0.5, 0.5, 0.02, 0.2);
    this.rotationX = 0;
    this.rotationY = 0;
    this.rotationZ = 0;
  }
}

class Cone {
  constructor() {
    this.geom = new THREE.ConeBufferGeometry(0.3, 0.5, 32);
    this.rotationX = 0;
    this.rotationY = 0;
    this.rotationZ = radians(-180);
  }
}

class Torus {
  constructor() {
    this.geom = new THREE.TorusBufferGeometry(0.3, 0.12, 30, 200);
    this.rotationX = radians(90);
    this.rotationY = 0;
    this.rotationZ = 0;
  }
}

class App {
  setup() {
    this.raycaster = new THREE.Raycaster();

    this.gutter = { size: 1 };
    this.meshes = [];
    this.grid = { cols: 11, rows: 7 };
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.mouse3d = new THREE.Vector2();
    this.geometries = [new Box(), new Torus(), new Cone()];
  }

  createScene() {
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight); // test
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.body.appendChild(this.renderer.domElement);
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      20,
      window.innerWidth / window.innerHeight,
      1
    );
    this.camera.position.set(0, 65, 0);
    this.camera.rotation.x = -1.57;

    this.scene.add(this.camera);
  }

  getRandomGeometry() {
    return this.geometries[
      Math.floor(Math.random() * Math.floor(this.geometries.length))
    ];
  }

  createGrid() {
    // create a basic 3D object to be used as a container for our grid elements so we can move all of them together
    this.groupMesh = new THREE.Object3D();

    const meshParams = {
      color: "#ff00ff",
      metalness: 0.58,
      emissive: "#000000",
      roughness: 0.18
    };

    // we create our material outside the loop to keep it more performant
    const material = new THREE.MeshPhysicalMaterial(meshParams);

    for (let row = 0; row < this.grid.rows; row++) {
      this.meshes[row] = [];

      for (let i = 0; i < 1; i++) {
        const totalCol = this.getTotalRows(row);

        for (let col = 0; col < this.grid.cols; col++) {
          const geometry = this.getRandomGeometry();
          const mesh = this.getMesh(geometry.geom, material);
          mesh.position.y = 0;
          mesh.position.x =
            col +
            col * this.gutter.size +
            (totalCol === this.grid.cols ? 0 : 2.5);
          mesh.position.z = row + row * (i + 0.25);
          mesh.rotation.x = geometry.rotationX;
          mesh.rotation.y = geometry.rotationY;
          mesh.rotation.z = geometry.rotationZ;
          mesh.initialRotation = {
            x: mesh.rotation.x,
            y: mesh.rotation.y,
            z: mesh.rotation.z
          };
          this.groupMesh.add(mesh);
          this.meshes[row][col] = mesh;
        }
      }
    }

    //center on the X and Z our group mesh containing all the grid elements
    const centerX =
      (this.grid.cols - 1 + (this.grid.cols - 1) * this.gutter.size) * 0.5;
    const centerZ =
      (this.grid.rows - 1 + (this.grid.rows - 1) * this.gutter.size) * 0.5;
    this.groupMesh.position.set(-centerX, 0, -centerZ);

    this.scene.add(this.groupMesh);
  }

  getMesh(geometry, material) {
    const mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  getTotalRows(col) {
    return col % 2 === 0 ? this.grid.cols : this.grid.cols - 1;
  }

  addAmbientLight() {
    const light = new THREE.AmbientLight("#2900af", 1);
    this.scene.add(light);
  }

  addSpotLight() {
    const sLight = new THREE.SpotLight("#e000ff", 1, 1000);
    sLight.position.set(0, 37, 0);
    sLight.castShadow = true;
    this.scene.add(sLight);
  }

  addRectLight() {
    const rLight = new THREE.RectAreaLight("#341212", 1, 2000, 2000);

    rLight.position.set(5, 50, 50);
    rLight.lookAt(0, 0, 0);

    this.scene.add(rLight);
  }

  addFloor() {
    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.ShadowMaterial({ opacity: 0.3 });

    this.floor = new THREE.Mesh(geometry, material);
    this.floor.position.y = 0;
    this.floor.receiveShadow = true;
    this.floor.rotateX(-Math.PI / 2);

    this.scene.add(this.floor);
  }

  draw() {
    this.raycaster.setFromCamera(this.mouse3d, this.camera);

    const intersects = this.raycaster.intersectObjects([this.floor]);

    //
    if (intersects.length) {
      const { x, z } = intersects[0].point;

      for (let r = 0; r < this.grid.rows; r++) {
        for (let i = 0; i < 1; i++) {
          const totalCols = this.getTotalRows(r);
          for (let c = 0; c < totalCols; c++) {
            const mesh = this.meshes[r][c];

            const mouseDistance = distance(
              x,
              z,
              mesh.position.x + this.groupMesh.position.x,
              mesh.position.z + this.groupMesh.position.z
            );
            const y = map(mouseDistance, 7, 0, 0, 6);
            TweenMax.to(mesh.position, 0.3, { y: y < 1 ? 1 : y });

            const scaleFactor = mesh.position.y / 1.2;
            const scale = scaleFactor < 1 ? 1 : scaleFactor;
            TweenMax.to(mesh.scale, 0.3, {
              ease: Expo.easeOut,
              x: scale,
              y: scale,
              z: scale
            });

            TweenMax.to(mesh.rotation, 0.7, {
              ease: Expo.easeOut,
              x: map(
                mesh.position.y,
                -1,
                1,
                radians(270),
                mesh.initialRotation.x
              ),
              z: map(
                mesh.position.y,
                -1,
                1,
                radians(-90),
                mesh.initialRotation.z
              ),
              y: map(
                mesh.position.y,
                -1,
                1,
                radians(45),
                mesh.initialRotation.y
              )
            });
          }
        }
      }
    }
  }

  onMouseMove({ clientX, clientY }) {
    this.mouse3d.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse3d.y = (clientY / window.innerHeight) * 2 - 1;
  }

  init() {
    this.setup();
    this.createScene();
    this.createCamera();
    this.createGrid();
    this.addAmbientLight();
    this.addSpotLight();
    this.addRectLight();
    this.addFloor();
    this.animate();

    window.addEventListener("mousemove", this.onMouseMove.bind(this), false);

    this.onMouseMove({ clientX: 0, clientY: 0 });
  }

  animate() {
    this.draw();
    console.log("test");
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate.bind(this));
  }
}

window.onload = function() {
  new App().init();
};
