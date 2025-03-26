/**
 * Character controller for 3D SMASH Game
 */

const Character = {
    mesh: null,
    body: null,
    model: null,

    // Character parts for animation
    parts: {
        head: null,
        torso: null,
        leftArm: null,
        rightArm: null,
        leftLeg: null,
        rightLeg: null,
        leftArmGroup: null,
        rightArmGroup: null,
        leftLegGroup: null,
        rightLegGroup: null,
        fpArms: null // First-person arms
    },

    // Character properties
    moveSpeed: 5, // More realistic walking speed
    jumpForce: 8, // Adjusted jump force
    canJump: true,
    // canDoubleJump: true, // Let's disable double jump for now for simplicity
    // doubleJumpCooldown: 0,
    isOnGround: false,
    knockbackMultiplier: 1.0,
    lastDirection: new THREE.Vector3(),
    moveSmoothing: 0.2, // Lower for quicker response
    isFirstPerson: true, // Flag for first-person mode

    // Animation properties
    animationSpeed: 8, // Slower walk animation
    animationTime: 0,
    isMoving: false,

    // Punch animation properties
    isPunching: false,
    punchAnimationTime: 0,
    punchDuration: 0.3, // Duration in seconds
    punchCooldown: 0,

    // Physics reference
    physicsWorld: null,
    // REMOVED: Incorrect Raycaster/Ray initialization for CANNON 0.6.2
    // raycaster: new CANNON.Raycaster(),
    // groundCheckRay: new CANNON.Ray(),

    // Create character mesh and physics body
    create: function(scene, world, spawnPosition) {
        this.physicsWorld = world;

        this.createModel(scene);
        if (this.model) { // Check if model was created successfully
            this.model.position.copy(spawnPosition);
        } else {
            console.error("Character model failed to create!");
            return null; // Indicate failure
        }


        // Create physics body - Capsule might be better but Box is simpler for now
        // Use a slightly smaller box than the visual model to avoid snagging
        const characterShape = new CANNON.Box(new CANNON.Vec3(0.3, 0.8, 0.3)); // Width, Height, Depth / 2
        const characterMaterial = new CANNON.Material('character');
        characterMaterial.friction = 0.1; // Low friction against walls
        characterMaterial.restitution = 0.0; // No bounce

        this.body = new CANNON.Body({
            mass: 70, // Realistic mass (kg)
            material: characterMaterial,
            fixedRotation: true, // Prevent tumbling
            linearDamping: 0.9 // High damping simulates air resistance/friction - stops sliding
        });
        if (!this.body) {
             console.error("Failed to create Cannon.Body!");
             return null;
        }

        // Offset the shape vertically so the body origin is at the feet
        this.body.addShape(characterShape, new CANNON.Vec3(0, 0.8, 0)); // Offset shape by its half-height

        this.body.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
        this.body.updateMassProperties();

        // Ensure world exists before adding body
        if (world) {
           world.addBody(this.body);
        } else {
           console.error("Physics world not provided to Character.create!");
        }


        this.isOnGround = false; // Start assuming not on ground
        this.canJump = false;

        console.log("Character created at:", spawnPosition);
        return this.model; // Return the Three.js model group
    },

    createModel: function(scene) {
        this.model = new THREE.Group();
        if (!scene) {
             console.error("Scene not provided to Character.createModel!");
             return; // Cannot proceed
        }

        const characterTexture = TextureManager.get('character');
        if (!characterTexture) {
            console.warn("Character texture not found, using basic material.");
        }
        const characterMaterial = new THREE.MeshStandardMaterial({
            map: characterTexture || null, // Use texture or fallback
            color: characterTexture ? 0xffffff : 0xcccccc // Use white with texture, gray otherwise
        });


        // Head
        const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        this.parts.head = new THREE.Mesh(headGeometry, characterMaterial);
        this.parts.head.position.set(0, 1.55, 0); // Position relative to model origin (feet)
        this.parts.head.castShadow = true;

        // Body
        const bodyGeometry = new THREE.BoxGeometry(0.5, 0.6, 0.3);
        this.parts.torso = new THREE.Mesh(bodyGeometry, characterMaterial);
        this.parts.torso.position.set(0, 1.0, 0); // Centered above origin
        this.parts.torso.castShadow = true;

        // Arms - Pivoted correctly
        const armGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        this.parts.leftArmGroup = new THREE.Group();
        this.parts.leftArm = new THREE.Mesh(armGeometry, characterMaterial);
        this.parts.leftArm.position.set(0, -0.3, 0); // Pivot at top
        this.parts.leftArm.castShadow = true;
        this.parts.leftArmGroup.add(this.parts.leftArm);
        this.parts.leftArmGroup.position.set(-0.35, 1.3, 0); // Shoulder position
        this.model.add(this.parts.leftArmGroup);

        this.parts.rightArmGroup = new THREE.Group();
        this.parts.rightArm = new THREE.Mesh(armGeometry, characterMaterial);
        this.parts.rightArm.position.set(0, -0.3, 0); // Pivot at top
        this.parts.rightArm.castShadow = true;
        this.parts.rightArmGroup.add(this.parts.rightArm);
        this.parts.rightArmGroup.position.set(0.35, 1.3, 0); // Shoulder position
        this.model.add(this.parts.rightArmGroup);

        // Legs - Pivoted correctly
        const legGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        this.parts.leftLegGroup = new THREE.Group();
        this.parts.leftLeg = new THREE.Mesh(legGeometry, characterMaterial);
        this.parts.leftLeg.position.set(0, -0.3, 0); // Pivot at top
        this.parts.leftLeg.castShadow = true;
        this.parts.leftLegGroup.add(this.parts.leftLeg);
        this.parts.leftLegGroup.position.set(-0.15, 0.7, 0); // Hip position
        this.model.add(this.parts.leftLegGroup);

        this.parts.rightLegGroup = new THREE.Group();
        this.parts.rightLeg = new THREE.Mesh(legGeometry, characterMaterial);
        this.parts.rightLeg.position.set(0, -0.3, 0); // Pivot at top
        this.parts.rightLeg.castShadow = true;
        this.parts.rightLegGroup.add(this.parts.rightLeg);
        this.parts.rightLegGroup.position.set(0.15, 0.7, 0); // Hip position
        this.model.add(this.parts.rightLegGroup);


        // Add torso and head AFTER limbs so they render correctly if overlapping slightly
        this.model.add(this.parts.torso);
        this.model.add(this.parts.head);


        // Create first-person arms (attached to camera later)
        this.createFirstPersonArms(scene);

        scene.add(this.model);

        // Initial visibility update
        this.updateVisibility();

        console.log("Character model created with parts:",
            "leftArmGroup exists:", !!this.parts.leftArmGroup,
            "rightArmGroup exists:", !!this.parts.rightArmGroup,
            "leftLegGroup exists:", !!this.parts.leftLegGroup,
            "rightLegGroup exists:", !!this.parts.rightLegGroup
        );
    },

    checkGround: function() {
        // Safety check: ensure body and physics world are available
        if (!this.body || !this.physicsWorld) {
            // console.warn("checkGround called too early or physics world missing.");
            this.isOnGround = false; // Assume not grounded if check cannot be performed
            this.canJump = false;
            return;
        }

        const start = this.body.position;
        // Ray starts slightly below the body center (at feet level + offset) and goes down
        const rayVerticalOffset = 0.1; // How much below the body origin (feet) to start the ray
        const rayCheckDistance = 0.2;  // How far down to check from the start point (needs to be > offset)

        // Ensure ray starts slightly above ground for checks
        const rayFrom = new CANNON.Vec3(start.x, start.y + rayVerticalOffset, start.z);
        const rayTo = new CANNON.Vec3(start.x, start.y - rayCheckDistance, start.z);

        // Use a reusable result object if desired, or create new one
        const result = new CANNON.RaycastResult();
        result.reset();

        // Collision filter options (important to avoid hitting self)
        const options = {
             // collisionFilterGroup: 1, // Assuming character is group 1 - Optional: define groups/masks if needed
             collisionFilterMask: -1,  // Check against everything
             skipBackfaces: true      // Don't detect hits from inside objects
        };

        // Perform the raycast using the world method
        const hasHit = this.physicsWorld.raycastClosest(rayFrom, rayTo, options, result);

        // Check if the hit is valid ground
        const groundNormalThreshold = 0.7; // How steep a slope counts as ground
        let onValidGround = false;

        if (hasHit) {
            // Optional: Check if the hit body is NOT the character itself
            // This check might be needed depending on CANNON version and setup.
            // if (result.body !== this.body) { // Example check
                 if (result.hitNormalWorld.y >= groundNormalThreshold) {
                      onValidGround = true;
                 }
            // }
        }


        if (onValidGround) {
             if (!this.isOnGround) {
                 // console.log("Ground contact detected by raycast");
             }
             this.isOnGround = true;
             this.canJump = true; // Allow jumping when grounded
        } else {
            if (this.isOnGround) {
                // console.log("Left ground");
            }
            this.isOnGround = false;
            this.canJump = false;
        }
        // Optional Debug Ray
        // this.drawDebugRay(rayFrom, rayTo, onValidGround ? 0x00ff00 : 0xff0000); // Green=ground, Red=air
    },

    // Helper to visualize the raycast
    drawDebugRay: function(start, end, color) {
        // Ensure Game and Game.scene are available
        if (!window.Game || !window.Game.scene) return;

        if (!this.debugLine) {
            const material = new THREE.LineBasicMaterial({ color: color, depthTest: false, depthWrite: false }); // Disable depth test to see it always
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(), new THREE.Vector3()
            ]);
            this.debugLine = new THREE.Line(geometry, material);
            this.debugLine.renderOrder = 999; // Render on top
            Game.scene.add(this.debugLine);
        }
        this.debugLine.material.color.setHex(color);
        this.debugLine.geometry.attributes.position.setXYZ(0, start.x, start.y, start.z);
        this.debugLine.geometry.attributes.position.setXYZ(1, end.x, end.y, end.z);
        this.debugLine.geometry.attributes.position.needsUpdate = true;
    },


    move: function(direction, deltaTime) {
        if (!this.body) return; // Safety check

        this.isMoving = direction.lengthSq() > 0.01; // Use squared length for efficiency

        if (!this.isMoving) {
             // Apply damping manually when not moving for snappier stops on ground
            if (this.isOnGround) {
                // Gradually reduce velocity instead of instant stop for smoother feel
                 const stopFactor = Math.pow(0.1, deltaTime * 10); // Adjust multiplier for faster/slower stop
                 this.body.velocity.x *= stopFactor;
                 this.body.velocity.z *= stopFactor;

                 // Clamp velocity to zero if very small
                 if (Math.abs(this.body.velocity.x) < 0.01) this.body.velocity.x = 0;
                 if (Math.abs(this.body.velocity.z) < 0.01) this.body.velocity.z = 0;

            }
             // Keep existing linear damping for air control stops
            return;
        }

        // Apply force based movement - feels more physical
        const currentVelocity = this.body.velocity;
        const targetVelocity = direction.clone().scale(this.moveSpeed); // Use clone

        // Calculate force needed to reach target velocity
        // Use different acceleration based on ground state
        const accel = this.isOnGround ? 200.0 : 50.0; // Higher accel on ground, lower in air
        let force = new CANNON.Vec3(); // Create new Vec3 for force calculation
        targetVelocity.vsub(currentVelocity, force); // Vector subtraction: target - current -> stored in 'force'
        force.y = 0; // No vertical force from movement input

        // Limit force magnitude to the acceleration value
        const maxForceMagnitude = accel;
        if (force.lengthSquared() > maxForceMagnitude * maxForceMagnitude) {
            force.normalize();
            force.scale(maxForceMagnitude, force); // Scale normalized force by accel magnitude
        }

        // Apply force (scaled by body mass implicitly by Cannon, force is in Newtons)
        // ApplyForce expects force in Newtons (mass * acceleration)
        this.body.applyForce(force.scale(this.body.mass), this.body.position);

        // Update last direction for third-person model rotation
        if (!this.isFirstPerson) {
            this.lastDirection.copy(direction);
        }
    },


    jump: function() {
         if (!this.body) return false; // Safety check

        if (this.canJump && this.isOnGround) {
            // Apply an instantaneous upward velocity change
            this.body.velocity.y = this.jumpForce; // Directly set y velocity
            this.canJump = false; // Prevent immediate re-jump
            this.isOnGround = false; // We are now airborne
            console.log("Jump executed! Velocity Y set to:", this.jumpForce);
            // Reset leg positions slightly later via animation update
            return true;
        }
         else {
            console.log("Jump failed - canJump:", this.canJump, "isOnGround:", this.isOnGround);
            return false;
        }
    },

    // Apply knockback
    applyKnockback: function(target) {
         if (!target || !target.body || !this.body) return; // Safety checks
         const direction = new CANNON.Vec3();
         target.body.position.vsub(this.body.position, direction); // target - player
         direction.normalize();
         direction.y = 0.5; // Add upward component
         direction.normalize(); // Renormalize

         const baseForce = 50; // Base knockback force
         const scaleFactor = 1.0; // Could scale based on target mass or other factors later
         const impulseMagnitude = baseForce * this.knockbackMultiplier * scaleFactor;
         const impulse = direction.scale(impulseMagnitude);

         target.body.applyImpulse(impulse, target.body.position);
         this.knockbackMultiplier += 0.2;
         console.log('Knockback applied. New multiplier:', this.knockbackMultiplier.toFixed(1));
    },

    startPunchAnimation: function() {
        if (this.punchCooldown <= 0) {
            this.isPunching = true;
            this.punchAnimationTime = 0;
            this.punchCooldown = 0.5; // Cooldown in seconds
            // console.log("Starting punch animation");
        }
    },

    // Animate punching motion
    animatePunch: function(deltaTime) {
        if (!this.isPunching || !this.parts.rightArmGroup) return;

        this.punchAnimationTime += deltaTime;
        const progress = Math.min(this.punchAnimationTime / this.punchDuration, 1);

        let punchAngle;
        // Use easing function for smoother punch (e.g., easeOutQuad)
        const easeOutQuad = t => t * (2 - t);
        const easedProgress = easeOutQuad(progress);

        if (progress < 0.5) {
            // Forward motion (0 -> 0.5 progress maps to 0 -> 1 eased)
            const forwardProgress = progress * 2;
            punchAngle = Utils.lerp(0, -Math.PI / 1.8, easeOutQuad(forwardProgress)); // Punch further
        } else {
            // Return motion (0.5 -> 1 progress maps to 0 -> 1 eased, reversed)
            const returnProgress = (progress - 0.5) * 2;
            punchAngle = Utils.lerp(-Math.PI / 1.8, 0, easeOutQuad(returnProgress));
        }
        this.parts.rightArmGroup.rotation.x = punchAngle;

        // Also animate FP arm if visible
        if (this.isFirstPerson && this.parts.fpRightArm) {
             const baseFPArmAngle = 0.1;
             this.parts.fpRightArm.rotation.x = punchAngle + baseFPArmAngle; // Add base angle back
        }


        if (progress >= 1) {
            this.isPunching = false;
             // Ensure FP arm returns to base angle
            if (this.isFirstPerson && this.parts.fpRightArm) {
                 this.parts.fpRightArm.rotation.x = 0.1; // Reset to base angle
            }
            // console.log("Punch animation completed");
        }
    },

    reset: function(spawnPosition) {
         if (!this.body || !spawnPosition) return; // Safety check

        this.body.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.knockbackMultiplier = 1.0;
        this.isOnGround = false; // Will be checked next frame
        this.canJump = false;
        this.isPunching = false; // Stop punching on reset
        this.punchAnimationTime = 0;
        this.resetLegPositions();
        console.log("Character reset to:", spawnPosition);
    },

    resetLegPositions: function() {
        // Smoothly reset positions instead of instantly? Lerp towards 0.
        const lerpFactor = 0.5; // Adjust speed of reset lerp
        if (this.parts.leftLegGroup) this.parts.leftLegGroup.rotation.x = Utils.lerp(this.parts.leftLegGroup.rotation.x, 0, lerpFactor);
        if (this.parts.rightLegGroup) this.parts.rightLegGroup.rotation.x = Utils.lerp(this.parts.rightLegGroup.rotation.x, 0, lerpFactor);
        if (this.parts.leftArmGroup) this.parts.leftArmGroup.rotation.x = Utils.lerp(this.parts.leftArmGroup.rotation.x, 0, lerpFactor);
        // Only reset right arm if not punching
        if (this.parts.rightArmGroup && !this.isPunching) {
             this.parts.rightArmGroup.rotation.x = Utils.lerp(this.parts.rightArmGroup.rotation.x, 0, lerpFactor);
        }
    },

    animateWalking: function(deltaTime) {
        // Check required parts
        if (!this.parts.leftArmGroup || !this.parts.rightArmGroup ||
            !this.parts.leftLegGroup || !this.parts.rightLegGroup) {
            return; // Silently return if parts missing
        }

        const lerpFactor = deltaTime * 10; // Speed of returning to neutral / moving towards target pose

        if (this.isOnGround) {
            if (this.isMoving) {
                // Use global time for consistency in animation speed regardless of frame rate fluctuations
                 const walkTime = (Game.lastTime || performance.now()) / 1000;
                 const swingSpeed = this.animationSpeed; // Use defined speed
                 const swingAngle = Math.sin(walkTime * swingSpeed) * 0.7; // Max swing angle

                this.parts.leftLegGroup.rotation.x = Utils.lerp(this.parts.leftLegGroup.rotation.x, swingAngle, lerpFactor);
                this.parts.rightLegGroup.rotation.x = Utils.lerp(this.parts.rightLegGroup.rotation.x, -swingAngle, lerpFactor);
                // Only swing arms if not punching
                if (!this.isPunching) {
                    this.parts.leftArmGroup.rotation.x = Utils.lerp(this.parts.leftArmGroup.rotation.x, -swingAngle * 0.5, lerpFactor);
                    this.parts.rightArmGroup.rotation.x = Utils.lerp(this.parts.rightArmGroup.rotation.x, swingAngle * 0.5, lerpFactor);
                }

            } else {
                // Return to neutral when stopped on ground smoothly
                this.parts.leftLegGroup.rotation.x = Utils.lerp(this.parts.leftLegGroup.rotation.x, 0, lerpFactor);
                this.parts.rightLegGroup.rotation.x = Utils.lerp(this.parts.rightLegGroup.rotation.x, 0, lerpFactor);
                 if (!this.isPunching) {
                     this.parts.leftArmGroup.rotation.x = Utils.lerp(this.parts.leftArmGroup.rotation.x, 0, lerpFactor);
                     this.parts.rightArmGroup.rotation.x = Utils.lerp(this.parts.rightArmGroup.rotation.x, 0, lerpFactor);
                 }
            }
        } else {
            // In air pose (arms/legs slightly out) - Apply gradually
             const airPoseFactor = deltaTime * 5; // Slower transition in air
             const legAirAngle = 0.2;
             const armAirAngle = -0.3;
             this.parts.leftLegGroup.rotation.x = Utils.lerp(this.parts.leftLegGroup.rotation.x, legAirAngle, airPoseFactor);
             this.parts.rightLegGroup.rotation.x = Utils.lerp(this.parts.rightLegGroup.rotation.x, -legAirAngle, airPoseFactor);
             if (!this.isPunching) {
                 this.parts.leftArmGroup.rotation.x = Utils.lerp(this.parts.leftArmGroup.rotation.x, armAirAngle, airPoseFactor);
                 this.parts.rightArmGroup.rotation.x = Utils.lerp(this.parts.rightArmGroup.rotation.x, armAirAngle, airPoseFactor);
             }
        }
    },

    createFirstPersonArms: function(scene) {
        this.parts.fpArms = new THREE.Group(); // This group will be attached to the CAMERA
        if (!scene) {
             console.error("Scene not provided to Character.createFirstPersonArms!");
             return;
        }

        const characterTexture = TextureManager.get('character');
        const characterMaterial = new THREE.MeshStandardMaterial({
            map: characterTexture || null,
            color: characterTexture ? 0xffffff : 0xcccccc
        });

        const armGeom = new THREE.BoxGeometry(0.2, 0.6, 0.2); // Slimmer arms might look better

        // Left FP Arm
        const leftArmContainer = new THREE.Group();
        const leftArm = new THREE.Mesh(armGeom, characterMaterial);
        leftArm.position.set(0, -0.3, 0); // Pivot at top
        leftArm.castShadow = true; // FP arms can cast shadows
        leftArmContainer.add(leftArm);
        leftArmContainer.position.set(-0.3, -0.35, -0.5); // Position relative to camera (X, Y, Z) - Adjusted Y
        leftArmContainer.rotation.x = 0.1; // Slight downward angle
        this.parts.fpArms.add(leftArmContainer);
        this.parts.fpLeftArm = leftArmContainer; // Store container

        // Right FP Arm
        const rightArmContainer = new THREE.Group();
        const rightArm = new THREE.Mesh(armGeom, characterMaterial);
        rightArm.position.set(0, -0.3, 0); // Pivot at top
        rightArm.castShadow = true;
        rightArmContainer.add(rightArm);
        rightArmContainer.position.set(0.3, -0.35, -0.5); // Position relative to camera - Adjusted Y
        rightArmContainer.rotation.x = 0.1; // Slight downward angle
        this.parts.fpArms.add(rightArmContainer);
        this.parts.fpRightArm = rightArmContainer; // Store container

        // Initially hide
        this.parts.fpArms.visible = false;

        // Add the fpArms group TO THE CAMERA in Game.init
        // Game.camera.add(this.parts.fpArms);
    },

    // Update first-person arms position and visibility
    updateFirstPersonArms: function(deltaTime) {
        // Ensure Game object and camera exist
        if (!window.Game || !Game.camera || !this.parts.fpArms || !this.parts.fpLeftArm || !this.parts.fpRightArm) return;

        this.parts.fpArms.visible = this.isFirstPerson;

        if (this.isFirstPerson) {
            // Add bobbing effect when moving on ground
            let bobOffsetY = 0;
            let bobOffsetX = 0;
            if (this.isMoving && this.isOnGround) {
                const bobSpeed = 10;
                const bobAmountY = 0.015;
                const bobAmountX = 0.01;
                const bobTime = (Game.lastTime || performance.now()) / 1000 * bobSpeed;

                bobOffsetY = Math.sin(bobTime * 2) * bobAmountY; // Vertical bob
                bobOffsetX = Math.cos(bobTime) * bobAmountX; // Horizontal sway
            }

            // Apply bobbing to the fpArms group's LOCAL position relative to camera
            this.parts.fpArms.position.x = bobOffsetX; // Main sway applied to group
            // Base Y position for arms
            const baseY = -0.35;
            this.parts.fpLeftArm.position.y = baseY + bobOffsetY;
            this.parts.fpRightArm.position.y = baseY + bobOffsetY; // Same bob for both arms

             // Smoothly return arms to default rotation if not punching
             const lerpFactor = deltaTime * 15;
             const baseFPArmAngle = 0.1;

             if (!this.isPunching && this.parts.fpRightArm) {
                 this.parts.fpRightArm.rotation.x = Utils.lerp(this.parts.fpRightArm.rotation.x, baseFPArmAngle, lerpFactor);
             }
             // Also ensure left arm returns (or stays at) base angle
              if (this.parts.fpLeftArm) {
                  this.parts.fpLeftArm.rotation.x = Utils.lerp(this.parts.fpLeftArm.rotation.x, baseFPArmAngle, lerpFactor);
              }

        }
    },

    updateVisibility: function() {
        const visible = !this.isFirstPerson;
        // Check if parts exist before setting visibility
        if (this.parts.head) this.parts.head.visible = visible;
        if (this.parts.torso) this.parts.torso.visible = visible;
        if (this.parts.leftArmGroup) this.parts.leftArmGroup.visible = visible;
        if (this.parts.rightArmGroup) this.parts.rightArmGroup.visible = visible;
        if (this.parts.leftLegGroup) this.parts.leftLegGroup.visible = visible;
        if (this.parts.rightLegGroup) this.parts.rightLegGroup.visible = visible;

        // FP arms visibility handled in updateFirstPersonArms
    },

    update: function(deltaTime) {
        // Check necessary components exist
         if (!this.body || !this.model) {
             // console.error("Character update called before body or model initialized!"); // Reduce log spam
             return;
         }

        // 1. Check ground status using raycast
        this.checkGround();

        // 2. Sync model position with physics body AFTER physics step
        this.model.position.copy(this.body.position);

        // 3. Rotate model and physics body
        if (this.isFirstPerson) {
            // In FP, the physics body's rotation should match the camera's yaw
            if (window.Game && Game.camera) { // Check Game context
                const cameraQuaternion = Game.camera.quaternion;
                // Create a quaternion representing only the yaw
                const yawQuaternion = new CANNON.Quaternion();
                // Get camera's forward vector, project to XZ plane, get angle
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraQuaternion);
                const angleY = Math.atan2(forward.x, forward.z);

                // Check if angleY is a valid number
                if (!isNaN(angleY)) {
                    yawQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angleY);

                    // Apply this yaw to the physics body
                    if (this.body.quaternion) {
                       this.body.quaternion.copy(yawQuaternion);
                    } else {
                         console.error("Character.update: this.body.quaternion is missing!");
                    }

                    // Update the visual model's rotation
                    if (this.model.rotation) {
                        this.model.rotation.y = angleY;
                    } else {
                         console.error("Character.update: this.model.rotation is missing!", this.model);
                    }
                } else {
                     // console.warn("Character.update: Calculated angleY is NaN."); // Reduce spam
                }
            }
        } else { // Third Person
            if (this.lastDirection.lengthSq() > 0.01) {
                const targetRotation = Math.atan2(this.lastDirection.x, this.lastDirection.z);
                 // Check validity and existence
                 if (!isNaN(targetRotation) && this.model && this.model.rotation) {
                     let currentRotation = this.model.rotation.y;
                     if (typeof currentRotation !== 'number') currentRotation = 0; // Ensure it's a number

                     let delta = targetRotation - currentRotation;
                     // Normalize angle difference for shortest path lerp
                     while (delta <= -Math.PI) delta += Math.PI * 2;
                     while (delta > Math.PI) delta -= Math.PI * 2;

                     const lerpSpeed = 10; // Speed of rotation interpolation
                     const newRotationY = currentRotation + delta * (deltaTime * lerpSpeed);
                     this.model.rotation.y = newRotationY;

                     // Also rotate the physics body in third person
                     if (this.body && this.body.quaternion) {
                        this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), newRotationY);
                     } else {
                          console.error("Character.update (TP): this.body.quaternion is missing!");
                     }
                 } else {
                      // console.warn("Character.update (TP): Invalid rotation calc or missing model/rotation."); // Reduce spam
                 }
            }
        }


        // 4. Update animations (walking, punching)
        if (this.isPunching) {
            this.animatePunch(deltaTime);
        } else {
            // Ensure walking animation only happens if needed (prevents unnecessary lerping)
            if (this.isMoving || !this.isOnGround ||
                this.parts.leftLegGroup.rotation.x !== 0 || // Check if not already in idle pose
                this.parts.rightLegGroup.rotation.x !== 0 ||
                this.parts.leftArmGroup.rotation.x !== 0 ||
                this.parts.rightArmGroup.rotation.x !== 0)
            {
               this.animateWalking(deltaTime);
            }
        }

        // 5. Update FP arms (bobbing, etc.) - happens relative to camera
        this.updateFirstPersonArms(deltaTime);


        // 6. Update cooldowns
        if (this.punchCooldown > 0) {
            this.punchCooldown -= deltaTime;
            if (this.punchCooldown < 0) this.punchCooldown = 0; // Prevent negative cooldown
        }

        // Note: isMoving flag is updated in move()
    }
}; // End of Character object definition