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
    moveSpeed: 25, // Increased from 5 (5x faster)
    jumpForce: 12, // Slightly increased for better jump height with faster movement
    canJump: true,
    isOnGround: false,
    lastGroundedTime: 0, // Track when we were last grounded for coyote time
    coyoteTimeThreshold: 0.2, // Seconds we allow jumping after leaving ground
    groundDetectionCushion: 0.2, // Tolerance for ground detection
    knockbackMultiplier: 1.0,
    moveSmoothing: 0.2, // Lower for quicker response
    // Simplified: Assuming always first-person for now
    // isFirstPerson: true, // Flag for first-person mode

    // Animation properties
    animationSpeed: 16, // Doubled from 8 to match faster movement
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

        // Create physics body
        // Use a capsule shape instead of a box for better movement
        const characterRadius = 0.25;
        const characterHeight = 1.6; // Total height
        const characterShape = new CANNON.Box(new CANNON.Vec3(0.25, 0.85, 0.25));
        
        const characterMaterial = new CANNON.Material('character');
        characterMaterial.friction = 0.3; // Higher friction against walls
        characterMaterial.restitution = 0.0; // No bounce

        this.body = new CANNON.Body({
            mass: 70, // Realistic mass (kg)
            material: characterMaterial,
            fixedRotation: true, // Prevent tumbling
            linearDamping: 0.1, // Reduced damping for more responsive movement
            angularDamping: 0.99, // High angular damping to prevent unwanted rotation
            allowSleep: false, // Ensure the physics body never sleeps
            collisionFilterGroup: 2, // Player group
            collisionFilterMask: -1  // Collide with everything
        });
        if (!this.body) {
             console.error("Failed to create Cannon.Body!");
             return null;
        }

        // Add the shape with offset (position is at feet, shape is centered on body)
        this.body.addShape(characterShape, new CANNON.Vec3(0, 0.85, 0));
        
        // Position the body at the spawn position
        this.body.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
        this.body.updateMassProperties();

        // Ensure world exists before adding body
        if (world) {
           world.addBody(this.body);
           console.log("Added character body to physics world at:", this.body.position.toString());
        } else {
           console.error("Physics world not provided to Character.create!");
        }

        this.isOnGround = false; 
        this.canJump = false;
        
        // Apply a small impulse at start to ensure physics activation
        this.body.applyImpulse(new CANNON.Vec3(0, 0.1, 0), this.body.position);

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
            this.isOnGround = false; 
            this.canJump = false;
            return;
        }

        // Get the current position of the character
        const position = this.body.position.clone();
        
        // Cast multiple rays from the character's position to better detect the ground
        // Setup rays in a grid pattern for more reliable detection
        const rays = [
            // Center ray - start closer to feet
            { from: new CANNON.Vec3(position.x, position.y, position.z), 
              to: new CANNON.Vec3(position.x, position.y - 2.5, position.z) },
            // Corner rays
            { from: new CANNON.Vec3(position.x - 0.2, position.y, position.z - 0.2), 
              to: new CANNON.Vec3(position.x - 0.2, position.y - 2.5, position.z - 0.2) },
            { from: new CANNON.Vec3(position.x + 0.2, position.y, position.z - 0.2), 
              to: new CANNON.Vec3(position.x + 0.2, position.y - 2.5, position.z - 0.2) },
            { from: new CANNON.Vec3(position.x - 0.2, position.y, position.z + 0.2), 
              to: new CANNON.Vec3(position.x - 0.2, position.y - 2.5, position.z + 0.2) },
            { from: new CANNON.Vec3(position.x + 0.2, position.y, position.z + 0.2), 
              to: new CANNON.Vec3(position.x + 0.2, position.y - 2.5, position.z + 0.2) }
        ];
        
        let onValidGround = false;
        let closestHitDistance = Infinity;
        let hitNormalY = null;
        let hitBody = null;
        
        // Temporarily disable collision response on the character
        const originalCollisionResponse = this.body.collisionResponse;
        this.body.collisionResponse = false;

        // Options for raycast
        const options = {
             collisionFilterMask: -1, // Check against everything
             skipBackfaces: false
        };
        
        // Use a single reusable result object
        const result = new CANNON.RaycastResult();

        // Perform raycasts for each ray
        for (const ray of rays) {
            result.reset(); // Reset result for this ray
            
            const hasHit = this.physicsWorld.raycastClosest(ray.from, ray.to, options, result);
            
            if (hasHit && result.body !== this.body) {
                // Consider surfaces with normal.y > 0.5 as valid ground
                // And consider anything within groundDetectionCushion distance as ground
                if (result.hitNormalWorld.y >= 0.5 && 
                    result.distance < this.groundDetectionCushion + 2.0 && 
                    result.distance < closestHitDistance) {
                    closestHitDistance = result.distance;
                    onValidGround = true;
                    hitNormalY = result.hitNormalWorld.y;
                    hitBody = result.body;
                }
            }
        }
        
        // Restore collision response
        this.body.collisionResponse = originalCollisionResponse;

        // Check contacts as another way to detect ground
        if (!onValidGround) {
            const contacts = this.physicsWorld.contacts;
            for (let i = 0; i < contacts.length; i++) {
                const contact = contacts[i];
                if ((contact.bi === this.body || contact.bj === this.body)) {
                    const otherBody = contact.bi === this.body ? contact.bj : contact.bi;
                    const normal = contact.bi === this.body ? contact.ni : contact.ni.scale(-1);
                    
                    // Check if contact normal is pointing upward
                    if (normal.y > 0.5) {
                        onValidGround = true;
                        hitNormalY = normal.y;
                        hitBody = otherBody;
                        break;
                    }
                }
            }
        }

        // Check Y velocity as a last resort - if very small and we're moving down, we're probably on ground
        const isMovingDown = this.body.velocity.y < 0;
        const isNearlyStoppedVertically = Math.abs(this.body.velocity.y) < 0.5;
        
        if (isMovingDown && isNearlyStoppedVertically && !onValidGround) {
            // Look for any physics body below us
            result.reset();
            const farRay = {
                from: new CANNON.Vec3(position.x, position.y, position.z),
                to: new CANNON.Vec3(position.x, position.y - 3.0, position.z)
            };
            
            const farHasHit = this.physicsWorld.raycastClosest(farRay.from, farRay.to, options, result);
            if (farHasHit && result.body !== this.body && result.distance < 3.0) {
                // If anything is nearby below us and we're barely moving, consider us grounded
                onValidGround = true;
                closestHitDistance = result.distance;
                hitNormalY = result.hitNormalWorld.y;
                hitBody = result.body;
            }
        }

        // Update grounded state
        const prevGrounded = this.isOnGround;
        this.isOnGround = onValidGround;
        
        // Track when we were last grounded for coyote time calculation
        if (this.isOnGround) {
            this.lastGroundedTime = Game.lastTime / 1000 || performance.now() / 1000;
        }
        
        // Coyote time: can jump for a short time after leaving ground
        const timeSinceGrounded = (Game.lastTime / 1000 || performance.now() / 1000) - this.lastGroundedTime;
        this.canJump = this.isOnGround || (timeSinceGrounded < this.coyoteTimeThreshold);
        
        // --- DEBUG LOGGING ---
        if (performance.now() % 60 < 1) { // Log roughly every 60 frames
             console.log(`checkGround: hasHit=${onValidGround}, hitNormalY=${hitNormalY?.toFixed(2)}, onValidGround=${onValidGround}`);
             console.log(`Character position: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
             console.log(`Grounded: ${this.isOnGround}, CanJump: ${this.canJump}, TimeSinceGrounded: ${timeSinceGrounded.toFixed(2)}`);
             
             if (hitBody) {
                 console.log(`Hit body position: (${hitBody.position.x.toFixed(2)}, ${hitBody.position.y.toFixed(2)}, ${hitBody.position.z.toFixed(2)})`);
                 console.log(`Hit distance: ${closestHitDistance.toFixed(2)}`);
             }
        }
        // --- END DEBUG LOGGING ---
        
        // Always draw the debug ray
        this.drawDebugRay(rays[0].from, rays[0].to, onValidGround ? 0x00ff00 : 0xff0000);
    },

    // Helper to visualize the raycast
    drawDebugRay: function(start, end, color) {
        // Ensure Game and Game.scene are available
        if (!window.Game || !window.Game.scene) return;

        // Create or update the debug line
        if (!this.debugLine) {
            const material = new THREE.LineBasicMaterial({ 
                color: color, 
                depthTest: false, 
                depthWrite: false,
                transparent: true,
                opacity: 0.7
            });
            
            // Create geometry for the line
            const linePoints = [
                new THREE.Vector3(start.x, start.y, start.z),
                new THREE.Vector3(end.x, end.y, end.z)
            ];
            
            const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
            this.debugLine = new THREE.Line(geometry, material);
            this.debugLine.renderOrder = 999; // Render on top
            
            // Add to scene directly, not to model
            Game.scene.add(this.debugLine);
        } else {
            // Update existing line position and color
            this.debugLine.material.color.setHex(color);
            
            // Update the line geometry to match new ray positions
            const positions = this.debugLine.geometry.attributes.position;
            if (positions) {
                positions.setXYZ(0, start.x, start.y, start.z);
                positions.setXYZ(1, end.x, end.y, end.z);
                positions.needsUpdate = true;
            }
        }
    },


    move: function(direction, deltaTime) {
        if (!this.body) return; // Safety check

        // Check if we're trying to move
        this.isMoving = direction.lengthSquared() > 0.01;

        if (!this.isMoving) {
            // If not actively moving, apply damping to quickly stop horizontal movement
            const stopFactor = this.isOnGround ? 0.01 : 0.1; // Stronger stop on ground
            this.body.velocity.x *= stopFactor;
            this.body.velocity.z *= stopFactor;
            
            // Snap to zero for very small velocities to prevent sliding
            if (Math.abs(this.body.velocity.x) < 0.5) this.body.velocity.x = 0;
            if (Math.abs(this.body.velocity.z) < 0.5) this.body.velocity.z = 0;
            return;
        }

        // Track time since we were last grounded to allow air control even when jumping/falling
        const timeSinceGrounded = (Game.lastTime / 1000 || performance.now() / 1000) - this.lastGroundedTime;
        const hasRecentGroundContact = timeSinceGrounded < 0.5; // More generous than jump coyote time
        
        // Scale movement speed based on ground state, but ensure some air control
        const speedScale = this.isOnGround ? 1.0 : 
                         hasRecentGroundContact ? 0.8 : 0.5;
        const speed = this.moveSpeed * speedScale;
        
        // Direct velocity control
        const targetVelocity = direction.clone().scale(speed);
        
        // Keep the current Y velocity - we don't want to interfere with gravity
        targetVelocity.y = this.body.velocity.y;
        
        // Different control method based on ground state
        if (this.isOnGround || hasRecentGroundContact) {
            // Use direct velocity control with blending for smooth acceleration
            const blendFactor = this.isOnGround ? 0.5 : 0.3;
            this.body.velocity.x = this.body.velocity.x * (1 - blendFactor) + targetVelocity.x * blendFactor;
            this.body.velocity.z = this.body.velocity.z * (1 - blendFactor) + targetVelocity.z * blendFactor;
        } else {
            // In air without recent ground contact, use force-based control for more physical feel
            const airControlFactor = 20; // Air control multiplier
            const force = new CANNON.Vec3();
            
            // Calculate needed force
            force.x = (targetVelocity.x - this.body.velocity.x) * airControlFactor;
            force.z = (targetVelocity.z - this.body.velocity.z) * airControlFactor;
            force.y = 0; // No vertical force from movement input
            
            // Limit maximum air control force
            const maxAirForce = 200;
            const forceMagnitudeSq = force.x * force.x + force.z * force.z;
            if (forceMagnitudeSq > maxAirForce * maxAirForce) {
                const scalar = maxAirForce / Math.sqrt(forceMagnitudeSq);
                force.x *= scalar;
                force.z *= scalar;
            }
            
            // Apply the force
            this.body.applyForce(force, this.body.position);
        }
        
        // Apply a speed cap to prevent excessive velocity
        const horizontalSpeed = Math.sqrt(
            this.body.velocity.x * this.body.velocity.x + 
            this.body.velocity.z * this.body.velocity.z
        );
        
        if (horizontalSpeed > this.moveSpeed * 1.2) {
            const scale = (this.moveSpeed * 1.2) / horizontalSpeed;
            this.body.velocity.x *= scale;
            this.body.velocity.z *= scale;
        }
        
        // Debug logging
        if (performance.now() % 120 < 1) {
            console.log(`Moving: ${this.isMoving}, Grounded: ${this.isOnGround}, TimeSinceGrounded: ${timeSinceGrounded.toFixed(2)}`);
            console.log(`Velocity: (${this.body.velocity.x.toFixed(2)}, ${this.body.velocity.y.toFixed(2)}, ${this.body.velocity.z.toFixed(2)})`);
        }
    },


    jump: function() {
         if (!this.body) return false; // Safety check

        // Main condition: allow jump only when grounded
        if (this.isOnGround) {
            // Clear any existing vertical velocity/forces
            this.body.velocity.y = 0;
            this.body.force.set(this.body.force.x, 0, this.body.force.z);
            
            // Apply an instantaneous upward velocity change for consistent jump height
            this.body.velocity.y = this.jumpForce; 
            
            // Apply a small impulse as well for more responsive jumping
            this.body.applyImpulse(new CANNON.Vec3(0, this.jumpForce / 2, 0), this.body.position);
            
            // Update state
            this.canJump = false; 
            this.isOnGround = false;
            
            // Short cooldown to prevent immediate re-grounding
            setTimeout(() => {
                if (this.body && this.body.velocity.y > 0) {
                    this.canJump = false;
                }
            }, 100);
            
            console.log("Jump executed with velocity:", this.jumpForce);
            return true;
        } 
        // Secondary condition: allow "coyote time" jump if player just left ground
        else if (this.canJump && this.body.velocity.y > -3.0 && this.body.velocity.y < 0) {
            // Clear existing vertical velocity/forces
            this.body.velocity.y = 0;
            this.body.force.set(this.body.force.x, 0, this.body.force.z);
            
            // Apply jump
            this.body.velocity.y = this.jumpForce;
            this.body.applyImpulse(new CANNON.Vec3(0, this.jumpForce / 2, 0), this.body.position);
            
            this.canJump = false;
            console.log("Coyote jump executed!");
            return true;
        }
        else {
            console.log("Jump failed - isOnGround:", this.isOnGround, "yVelocity:", this.body.velocity.y.toFixed(2));
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
        // Always hide the main model parts in first-person
        const visible = false; 
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
             return;
         }

        // 1. Check ground status using raycast
        this.checkGround();
        
        // Track velocity for debugging and air control
        const yVelocity = this.body.velocity.y;
        
        // 2. Apply a small downward force when on ground to help maintain contact
        if (this.isOnGround) {
            // Apply a gentle downward force to help maintain ground contact
            const groundingForce = 15 * this.body.mass; // Force in Newtons
            this.body.applyForce(new CANNON.Vec3(0, -groundingForce, 0), this.body.position);
            
            // Also reset vertical velocity if very small to prevent bouncing
            if (Math.abs(yVelocity) < 0.2) {
                this.body.velocity.y = 0;
            }
        }

        // 3. Sync model position with physics body
        this.model.position.copy(this.body.position);

        // 4. Rotate model and physics body
        if (window.Game && Game.camera) {
            const cameraQuaternion = Game.camera.quaternion;
            const yawQuaternion = new CANNON.Quaternion();
            // Get camera's forward vector, project to XZ plane, get angle
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraQuaternion);
            const angleY = Math.atan2(forward.x, forward.z);

            // Check if angleY is a valid number
            if (!isNaN(angleY)) {
                yawQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angleY);
                this.body.quaternion.copy(yawQuaternion);
                this.model.rotation.y = angleY;
            }
        }

        // 5. Update animations (walking, punching)
        if (this.isPunching) {
            this.animatePunch(deltaTime);
        } else {
            // Only animate if needed
            if (this.isMoving || !this.isOnGround ||
                this.parts.leftLegGroup.rotation.x !== 0 || 
                this.parts.rightLegGroup.rotation.x !== 0 ||
                this.parts.leftArmGroup.rotation.x !== 0 ||
                this.parts.rightArmGroup.rotation.x !== 0)
            {
               this.animateWalking(deltaTime);
            }
        }

        // 6. Update FP arms (bobbing, etc.)
        this.updateFirstPersonArms(deltaTime);

        // 7. Update cooldowns
        if (this.punchCooldown > 0) {
            this.punchCooldown -= deltaTime;
            if (this.punchCooldown < 0) this.punchCooldown = 0;
        }
        
        // 8. Prevent excessive falling velocity (terminal velocity)
        if (this.body.velocity.y < -20) {
            this.body.velocity.y = -20;
        }
        
        // 9. Debug logging (less frequent)
        if (performance.now() % 300 < 1) {
            console.log(`Position: (${this.body.position.x.toFixed(2)}, ${this.body.position.y.toFixed(2)}, ${this.body.position.z.toFixed(2)}), Y-Velocity: ${yVelocity.toFixed(2)}, Grounded: ${this.isOnGround}`);
        }
    }
}; // End of Character object definition