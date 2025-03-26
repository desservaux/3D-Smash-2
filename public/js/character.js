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
    moveSpeed: 36, // Reduced from 48 to 36
    jumpForce: 12,
    canJump: true,
    canDoubleJump: true,
    doubleJumpCooldown: 0,
    isOnGround: false,
    knockbackMultiplier: 1.0,
    lastDirection: new THREE.Vector3(),
    moveSmoothing: 0.7, // Reduced from 0.8 to 0.7 for smoother movement
    isFirstPerson: true, // Flag for first-person mode
    
    // Animation properties
    animationSpeed: 12, // Reduced from 16 to 12 for slower animations
    animationTime: 0,
    isMoving: false,
    
    // Punch animation properties
    isPunching: false,
    punchAnimationTime: 0,
    punchDuration: 0.3, // Duration in seconds
    punchCooldown: 0,
    
    // Physics reference
    physicsWorld: null,
    
    // Create character mesh and physics body
    create: function(scene, world, spawnPosition) {
        // Store reference to the physics world
        this.physicsWorld = world;
        
        // Create character model (simple blocky humanoid)
        this.createModel(scene);
        
        // Set initial position
        this.model.position.copy(spawnPosition);
        
        // Create physics body - adjusted to better match the visual model
        const characterShape = new CANNON.Box(new CANNON.Vec3(0.4, 0.9, 0.4));
        this.body = new CANNON.Body({
            mass: 5,
            material: new CANNON.Material('character'),
        });
        
        this.body.addShape(characterShape);
        
        // Position the body so that the bottom of the collision box aligns with the ground at y=0
        this.body.position.set(spawnPosition.x, spawnPosition.y + 0.25, spawnPosition.z);
        this.body.linearDamping = 0.2; // Reduced for less friction/drag
        this.body.fixedRotation = true; // Prevent character from rotating
        this.body.updateMassProperties(); // Make sure mass is distributed correctly
        
        // Add body to world
        world.addBody(this.body);
        
        // Set up collision detection for jumping
        this.setupCollisionDetection(world);
        
        // Ensure character starts on ground
        this.isOnGround = true;
        this.canJump = true;
        this.canDoubleJump = true;
        
        return this.model;
    },
    
    // Create character model with head, body, arms, and legs
    createModel: function(scene) {
        this.model = new THREE.Group();
        
        const characterMaterial = new THREE.MeshStandardMaterial({ 
            map: TextureManager.get('character')
        });
        
        // Head (slightly larger than a normal block for visibility)
        const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        this.parts.head = new THREE.Mesh(headGeometry, characterMaterial);
        this.parts.head.position.set(0, 0.8, 0);
        this.parts.head.castShadow = true;
        
        // In first-person mode, set head to invisible
        if (this.isFirstPerson) {
            this.parts.head.visible = false;
        }
        
        // Body
        const bodyGeometry = new THREE.BoxGeometry(0.5, 0.6, 0.3);
        this.parts.torso = new THREE.Mesh(bodyGeometry, characterMaterial);
        this.parts.torso.position.set(0, 0.3, 0);
        this.parts.torso.castShadow = true;
        
        // Arms - Create with proper pivot points
        const armGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        
        // For left arm, create a group to manage the pivot point
        this.parts.leftArmGroup = new THREE.Group();
        this.parts.leftArm = new THREE.Mesh(armGeometry, characterMaterial);
        
        // Position the mesh lower in the group, so pivot is at shoulder
        this.parts.leftArm.position.set(0, -0.3, 0);
        this.parts.leftArm.castShadow = true;
        
        // Add mesh to group and position group at shoulder
        this.parts.leftArmGroup.add(this.parts.leftArm);
        this.parts.leftArmGroup.position.set(-0.35, 0.6, 0);
        
        // Right arm - same approach
        this.parts.rightArmGroup = new THREE.Group();
        this.parts.rightArm = new THREE.Mesh(armGeometry, characterMaterial);
        this.parts.rightArm.position.set(0, -0.3, 0);
        this.parts.rightArm.castShadow = true;
        
        this.parts.rightArmGroup.add(this.parts.rightArm);
        this.parts.rightArmGroup.position.set(0.35, 0.6, 0);
        
        // Legs - Create with proper pivot points
        const legGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        
        // Left leg group
        this.parts.leftLegGroup = new THREE.Group();
        this.parts.leftLeg = new THREE.Mesh(legGeometry, characterMaterial);
        this.parts.leftLeg.position.set(0, -0.3, 0);
        this.parts.leftLeg.castShadow = true;
        
        this.parts.leftLegGroup.add(this.parts.leftLeg);
        this.parts.leftLegGroup.position.set(-0.15, 0, 0);
        
        // Right leg group
        this.parts.rightLegGroup = new THREE.Group();
        this.parts.rightLeg = new THREE.Mesh(legGeometry, characterMaterial);
        this.parts.rightLeg.position.set(0, -0.3, 0);
        this.parts.rightLeg.castShadow = true;
        
        this.parts.rightLegGroup.add(this.parts.rightLeg);
        this.parts.rightLegGroup.position.set(0.15, 0, 0);
        
        // Create first-person arms
        this.createFirstPersonArms(scene);
        
        // Add all parts to the model
        this.model.add(this.parts.head);
        this.model.add(this.parts.torso);
        this.model.add(this.parts.leftArmGroup);
        this.model.add(this.parts.rightArmGroup);
        this.model.add(this.parts.leftLegGroup);
        this.model.add(this.parts.rightLegGroup);
        
        // Verify all parts are added correctly
        console.log("Character model created with parts:", 
            "leftArmGroup exists:", !!this.parts.leftArmGroup,
            "rightArmGroup exists:", !!this.parts.rightArmGroup,
            "leftLegGroup exists:", !!this.parts.leftLegGroup,
            "rightLegGroup exists:", !!this.parts.rightLegGroup
        );
        
        // Test rotation on parts to ensure they work
        this.parts.leftArmGroup.rotation.x = 0.5;
        this.parts.rightArmGroup.rotation.x = -0.5;
        this.parts.leftLegGroup.rotation.x = -0.3;
        this.parts.rightLegGroup.rotation.x = 0.3;
        
        // Reset after 1 second to verify rotation is working
        setTimeout(() => {
            this.resetLegPositions();
            console.log("Reset limb positions after test");
        }, 1000);
        
        // Center the model so bottom of feet is at y=0
        this.model.position.y = 0;
        
        scene.add(this.model);
    },
    
    // Set up collision detection
    setupCollisionDetection: function(world) {
        this.body.addEventListener('collide', (event) => {
            // Check if collision is with the ground
            const contact = event.contact;
            
            // If the character's feet are touching something
            if (contact.bi.id === this.body.id) {
                const contactNormal = new CANNON.Vec3();
                contact.ni.negate(contactNormal);
                
                // Log contact normal for debugging
                console.log("Collision detected - contactNormal.y:", contactNormal.y);
                
                // If the contact normal is pointing up, character is on ground
                // Lower threshold even further from 0.1 to 0.01 to detect almost any upward contact
                if (contactNormal.y > 0.01) {
                    console.log("Ground contact detected - setting isOnGround to true");
                    this.isOnGround = true;
                    // Jump abilities are reset in update function when landing
                }
            }
        });
    },
    
    // Move character based on input
    move: function(direction, deltaTime) {
        console.log("Move called - direction:", direction.x, direction.z, "length:", direction.length());
        
        // If no direction, stop moving
        if (direction.length() === 0) {
            // Apply additional friction when not trying to move
            this.body.velocity.x *= 0.8;
            this.body.velocity.z *= 0.8;
            this.isMoving = false;
            return;
        }
        
        // Character is moving
        this.isMoving = true;
        console.log("Character is now moving, isMoving set to true");
        
        // In first-person mode, we don't need to update lastDirection since
        // the character rotation is set directly from camera rotation
        if (!this.isFirstPerson && direction.length() > 0.1) {
            this.lastDirection.copy(direction);
        }
        
        // Calculate target velocity
        const speed = this.moveSpeed;
        const targetVelocity = {
            x: direction.x * speed,
            z: direction.z * speed
        };
        
        // Apply different movement based on ground state
        if (this.isOnGround) {
            // On ground: Blend between current and target velocity for smooth movement
            // with higher priority to the target direction
            this.body.velocity.x = Utils.lerp(
                this.body.velocity.x, 
                targetVelocity.x, 
                this.moveSmoothing
            );
            
            this.body.velocity.z = Utils.lerp(
                this.body.velocity.z, 
                targetVelocity.z, 
                this.moveSmoothing
            );
            
            // Apply a small upward force to overcome any small bumps
            if (this.body.velocity.y < 0.1) {
                this.body.velocity.y = 0;
            }
        } else {
            // In air: Allow some air control but more limited
            const airControlFactor = 0.3;
            
            this.body.velocity.x = Utils.lerp(
                this.body.velocity.x, 
                targetVelocity.x, 
                airControlFactor
            );
            
            this.body.velocity.z = Utils.lerp(
                this.body.velocity.z, 
                targetVelocity.z, 
                airControlFactor
            );
        }
    },
    
    // Make character jump
    jump: function() {
        console.log("Jump function called with states - isOnGround:", this.isOnGround, 
                   "canJump:", this.canJump, "canDoubleJump:", this.canDoubleJump);
        
        // SIMPLIFIED JUMP APPROACH: Direct velocity setting instead of impulses
        
        // First jump - only allowed when on ground
        if (this.canJump && this.isOnGround) {
            // Apply direct velocity for more reliable jumping
            this.body.velocity.y = this.jumpForce;
            
            this.canJump = false;
            this.isOnGround = false;
            
            // Reset leg positions when jumping
            this.resetLegPositions();
            
            console.log("First jump executed - Set velocity directly to:", this.jumpForce);
            return true; // Successfully jumped
        } 
        // Double jump - only allowed when in air and canDoubleJump is true
        else if (this.canDoubleJump && !this.isOnGround) {
            // Apply the second jump with slightly less force
            this.body.velocity.y = this.jumpForce * 0.8;
            
            this.canDoubleJump = false;
            this.doubleJumpCooldown = 2; // 2 seconds cooldown
            
            console.log("Double jump executed - Set velocity directly to:", this.jumpForce * 0.8);
            return true; // Successfully jumped
        } else {
            // Log why the jump didn't happen
            if (!this.isOnGround && this.canJump) {
                console.log("Jump failed: Can't use first jump while in air");
            } else if (this.isOnGround && !this.canJump) {
                console.log("Jump failed: First jump on cooldown");
            } else if (!this.isOnGround && !this.canDoubleJump) {
                console.log("Jump failed: Double jump on cooldown");
            } else {
                console.log("Jump failed: Unknown reason");
            }
            return false; // Failed to jump
        }
    },
    
    // Apply knockback to a target (for testing with a dummy object)
    applyKnockback: function(target) {
        if (!target || !target.body) return;
        
        // Calculate direction from character to target
        const direction = new CANNON.Vec3();
        direction.copy(target.body.position);
        direction.vsub(this.body.position, direction);
        direction.normalize();
        
        // Apply upward component to knockback
        direction.y = 0.5;
        
        // Calculate knockback force based on multiplier
        const force = 20 * this.knockbackMultiplier;
        
        // Apply impulse to target
        const impulse = new CANNON.Vec3(
            direction.x * force, 
            direction.y * force, 
            direction.z * force
        );
        
        target.body.applyImpulse(impulse, target.body.position);
        
        // Increase knockback multiplier for next hit
        this.knockbackMultiplier += 0.2;
        
        console.log('Knockback applied with multiplier:', this.knockbackMultiplier);
    },
    
    // Start punch animation
    startPunchAnimation: function() {
        if (this.punchCooldown <= 0) {
            this.isPunching = true;
            this.punchAnimationTime = 0;
            this.punchCooldown = 0.5; // Set cooldown in seconds to prevent punch spam
            console.log("Starting punch animation");
        }
    },
    
    // Animate punching motion
    animatePunch: function(deltaTime) {
        if (!this.isPunching) return;
        
        // Update punch animation time
        this.punchAnimationTime += deltaTime;
        
        // Calculate punch progress (0 to 1)
        const progress = Math.min(this.punchAnimationTime / this.punchDuration, 1);
        
        // First half of animation: punch forward
        if (progress < 0.5) {
            // Map 0-0.5 to 0-1
            const forwardProgress = progress * 2;
            // Start at 0, move to -1.5 (forward punch)
            const punchAngle = -1.5 * forwardProgress;
            this.parts.rightArmGroup.rotation.x = punchAngle;
        } 
        // Second half of animation: return to position
        else {
            // Map 0.5-1 to 1-0
            const returnProgress = (progress - 0.5) * 2;
            // Start at -1.5, move back to 0
            const punchAngle = -1.5 * (1 - returnProgress);
            this.parts.rightArmGroup.rotation.x = punchAngle;
        }
        
        // End animation when complete
        if (progress >= 1) {
            this.isPunching = false;
            console.log("Punch animation completed");
        }
    },
    
    // Reset character position when falling off the island
    reset: function(spawnPosition) {
        this.body.position.set(spawnPosition.x, spawnPosition.y + 0.25, spawnPosition.z);
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.knockbackMultiplier = 1.0;
        this.isOnGround = true;
        this.canJump = true;
        this.canDoubleJump = true;
        this.doubleJumpCooldown = 0;
        this.resetLegPositions();
    },
    
    // Reset leg positions to default
    resetLegPositions: function() {
        if (this.parts.leftLegGroup) {
            this.parts.leftLegGroup.rotation.x = 0;
            this.parts.rightLegGroup.rotation.x = 0;
            this.parts.leftArmGroup.rotation.x = 0;
            this.parts.rightArmGroup.rotation.x = 0;
        }
    },
    
    // Animate the character's walking motion
    animateWalking: function(deltaTime) {
        console.log("AnimateWalking - isOnGround:", this.isOnGround, "isMoving:", this.isMoving);
        
        // Verify all limb groups exist before trying to animate
        if (!this.parts.leftArmGroup || !this.parts.rightArmGroup || 
            !this.parts.leftLegGroup || !this.parts.rightLegGroup) {
            console.error("Cannot animate walking - limb groups not found!");
            return;
        }
        
        if (!this.isOnGround) {
            // In air, show "falling" pose with arms out slightly
            this.parts.leftArmGroup.rotation.x = -0.2; // Reduced from -0.3
            this.parts.rightArmGroup.rotation.x = -0.2; // Reduced from -0.3
            this.parts.leftLegGroup.rotation.x = 0.15; // Reduced from 0.2
            this.parts.rightLegGroup.rotation.x = -0.15; // Reduced from -0.2
            return;
        }
        
        if (this.isMoving) {
            // Update animation time
            this.animationTime += deltaTime * this.animationSpeed;
            
            // Calculate leg and arm swing with more pronounced movement
            const legSwing = Math.sin(this.animationTime) * 1.5; // Reduced from 2.5 to 1.5
            console.log("Walking animation - legSwing:", legSwing, "animationTime:", this.animationTime);
            
            // Apply rotation to leg and arm GROUPS (not meshes directly)
            // Use direct assignment instead of adding/multiplying
            this.parts.leftLegGroup.rotation.x = legSwing;
            this.parts.rightLegGroup.rotation.x = -legSwing;
            this.parts.leftArmGroup.rotation.x = -legSwing;
            this.parts.rightArmGroup.rotation.x = legSwing;
            
            // Add some subtle side-to-side body movement
            this.parts.torso.rotation.z = Math.sin(this.animationTime) * 0.03; // Reduced from 0.05
            this.parts.head.rotation.z = Math.sin(this.animationTime) * 0.01; // Reduced from 0.02
            this.parts.head.rotation.y = Math.sin(this.animationTime * 0.5) * 0.07; // Reduced from 0.1
            
            // Log the current rotation values to verify they're changing
            console.log("Limb rotations:", 
                "leftLeg:", this.parts.leftLegGroup.rotation.x,
                "rightLeg:", this.parts.rightLegGroup.rotation.x,
                "leftArm:", this.parts.leftArmGroup.rotation.x,
                "rightArm:", this.parts.rightArmGroup.rotation.x
            );
        } else {
            // Gradually return to neutral position when not moving
            // Use smaller reduction factor for smoother transition
            this.parts.leftLegGroup.rotation.x *= 0.7;
            this.parts.rightLegGroup.rotation.x *= 0.7;
            this.parts.leftArmGroup.rotation.x *= 0.7;
            this.parts.rightArmGroup.rotation.x *= 0.7;
            this.parts.torso.rotation.z *= 0.7;
            this.parts.head.rotation.z *= 0.7;
            this.parts.head.rotation.y *= 0.7;
            
            // Reset animation time when stopped
            this.animationTime = 0;
        }
    },
    
    // Create first-person arms that are visible in first-person view
    createFirstPersonArms: function(scene) {
        // Create a group for first-person arms
        this.parts.fpArms = new THREE.Group();
        
        const characterMaterial = new THREE.MeshStandardMaterial({ 
            map: TextureManager.get('character'),
            transparent: true,
            opacity: 0.95
        });
        
        // Create a container for each arm that manages individual arm rotation
        const leftArmContainer = new THREE.Group();
        const rightArmContainer = new THREE.Group();
        
        // Create left arm for first-person view
        const leftArmGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
        const leftArm = new THREE.Mesh(leftArmGeometry, characterMaterial);
        leftArm.position.set(0, -0.25, 0); // Position relative to container
        leftArm.castShadow = true;
        leftArmContainer.add(leftArm);
        leftArmContainer.position.set(-0.3, -0.2, -0.1);
        leftArmContainer.rotation.x = 0.3; // Slight downward angle
        
        // Create right arm for first-person view
        const rightArmGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
        const rightArm = new THREE.Mesh(rightArmGeometry, characterMaterial);
        rightArm.position.set(0, -0.25, 0); // Position relative to container
        rightArm.castShadow = true;
        rightArmContainer.add(rightArm);
        rightArmContainer.position.set(0.3, -0.2, -0.1);
        rightArmContainer.rotation.x = 0.3; // Slight downward angle
        
        // Add arm containers to fpArms group
        this.parts.fpArms.add(leftArmContainer);
        this.parts.fpArms.add(rightArmContainer);
        
        // Store references for animation
        this.parts.fpLeftArm = leftArmContainer;
        this.parts.fpRightArm = rightArmContainer;
        
        // Add fpArms to the scene directly (not to the model)
        // This allows it to move with the camera in first-person mode
        scene.add(this.parts.fpArms);
        
        // Initially hide or show based on mode
        this.parts.fpArms.visible = this.isFirstPerson;
    },
    
    // Update first-person arms position and visibility
    updateFirstPersonArms: function(camera) {
        if (!this.parts.fpArms) return;
        
        // Update visibility based on first-person mode
        this.parts.fpArms.visible = this.isFirstPerson;
        
        if (this.isFirstPerson) {
            // Create a parent matrix to extract just the rotation but not scale/position
            const parentMatrix = new THREE.Matrix4();
            parentMatrix.makeRotationFromEuler(camera.rotation);
            
            // Position arms directly in the camera's local space
            this.parts.fpArms.position.copy(camera.position);
            
            // Apply the camera's rotation to the arms
            this.parts.fpArms.quaternion.setFromRotationMatrix(parentMatrix);
            
            // Fixed offset in local space (will stay relative to camera view)
            const localOffset = new THREE.Vector3(0, -0.3, -0.6);
            localOffset.applyQuaternion(this.parts.fpArms.quaternion);
            this.parts.fpArms.position.add(localOffset);
            
            // Add bobbing effect when moving
            if (this.isMoving && this.isOnGround) {
                // Simple arm bobbing animation
                const bobAmount = 0.03;
                const bobOffset = Math.sin(this.animationTime * 5) * bobAmount;
                
                // Apply bobbing in local Y axis
                const upVector = new THREE.Vector3(0, 1, 0);
                upVector.applyQuaternion(this.parts.fpArms.quaternion);
                upVector.multiplyScalar(bobOffset);
                this.parts.fpArms.position.add(upVector);
                
                // Slight side-to-side sway
                const swayAmount = 0.01;
                const swayOffset = Math.sin(this.animationTime * 2.5) * swayAmount;
                
                // Apply sway in local X axis
                const rightVector = new THREE.Vector3(1, 0, 0);
                rightVector.applyQuaternion(this.parts.fpArms.quaternion);
                rightVector.multiplyScalar(swayOffset);
                this.parts.fpArms.position.add(rightVector);
            }
        }
    },
    
    // Update character model visibility based on first-person mode
    updateVisibility: function() {
        // In first person mode, hide the entire model except for the first-person arms
        if (this.isFirstPerson) {
            // Hide all parts of the character model
            this.model.visible = false;
            
            // Only show first-person arms if they exist
            if (this.parts && this.parts.fpArms) {
                this.parts.fpArms.visible = true;
            }
        } else {
            // In third-person mode, show the entire model
            this.model.visible = true;
            
            // Hide first-person arms if they exist
            if (this.parts && this.parts.fpArms) {
                this.parts.fpArms.visible = false;
            }
        }
    },
    
    // Update character's mesh position to match physics body
    update: function(deltaTime) {
        console.log("Character update - deltaTime:", deltaTime);
        
        // Update position to match physics body exactly
        this.model.position.x = this.body.position.x;
        this.model.position.y = this.body.position.y - 0.25;
        this.model.position.z = this.body.position.z;
        
        // Rotate character model to face movement direction if moving (only in third-person mode)
        if (!this.isFirstPerson && this.lastDirection.length() > 0.1) {
            const targetRotation = Math.atan2(this.lastDirection.x, this.lastDirection.z);
            
            // Smoothly rotate the model to face the movement direction
            const currentRotation = this.model.rotation.y;
            this.model.rotation.y = Utils.lerp(
                currentRotation, 
                targetRotation, 
                0.1
            );
        } else if (this.isFirstPerson) {
            // In first-person, match the character's rotation to the camera's rotation
            if (Game.camera) {
                this.model.rotation.y = Game.cameraRotation.y;
            }
        }
        
        // Update first-person arms if camera is available
        if (Game.camera) {
            this.updateFirstPersonArms(Game.camera);
        }
        
        // Update character visibility based on first/third person mode
        this.updateVisibility();
        
        // Track previous ground state for jump ability resets
        const wasOnGround = this.isOnGround;
        
        // Reset ground detection each frame - will be set to true if detected
        // Only reset ground status if we're not in the middle of a jump
        if (this.body.velocity.y <= 0) {
            this.isOnGround = false;
            
            // Check for ground contact by ray casting
            // Create a ray from the character's position downward
            const rayStart = new CANNON.Vec3(this.body.position.x, this.body.position.y, this.body.position.z);
            const rayEnd = new CANNON.Vec3(this.body.position.x, this.body.position.y - 1.5, this.body.position.z);
            
            // Use Cannon.js ray casting to check for ground
            const ray = new CANNON.Ray(rayStart, rayEnd);
            ray.mode = CANNON.Ray.CLOSEST;
            ray.skipBackfaces = true;
            
            // Use the physics world to check for intersections
            const result = new CANNON.RaycastResult();
            // Only try to use ray if the physics world reference exists
            if (this.physicsWorld) {
                const hasHit = ray.intersectWorld(this.physicsWorld, { result: result });
                
                // If ray hits something within 1.5 units, consider the character grounded
                // Increased from 1.0 to 1.5 to be more forgiving
                if (hasHit && result.distance < 1.5) {
                    console.log("Ray detected ground at distance:", result.distance);
                    this.isOnGround = true;
                }
            }
            
            // Also check if velocity is very low - character might be on ground
            // This helps in cases where collision detection misses
            if (Math.abs(this.body.velocity.y) < 0.2) { // Increased from 0.1 to 0.2
                console.log("Setting grounded due to low Y velocity:", this.body.velocity.y);
                this.isOnGround = true;
            }
            
            // Force ground status if Y position is very close to 0
            // This is a failsafe for when all other methods fail
            if (Math.abs(this.body.position.y - 0.25) < 0.3) {
                console.log("Forcing ground status due to Y position:", this.body.position.y);
                this.isOnGround = true;
            }
        }
        
        // If falling fast enough, we might have walked off an edge
        if (this.body.velocity.y < -1.0) {
            console.log("Setting NOT grounded due to falling velocity:", this.body.velocity.y);
            this.isOnGround = false;
        }
        
        // Only reset jump abilities when landing on ground (wasn't on ground before, but is now)
        if (!wasOnGround && this.isOnGround) {
            console.log("Just landed on ground - resetting jump abilities");
            this.canJump = true;
            this.canDoubleJump = true;
        }
        
        // Force reset canJump after some time on ground to prevent getting stuck
        if (this.isOnGround && !this.canJump) {
            // If we've been on ground for a while, force reset jump ability
            if (!this._groundTimer) this._groundTimer = 0;
            this._groundTimer += deltaTime;
            
            if (this._groundTimer > 0.5) { // After 0.5 seconds on ground
                console.log("Force resetting jump ability after time on ground");
                this.canJump = true;
                this._groundTimer = 0;
            }
        } else {
            this._groundTimer = 0;
        }
        
        // Update punch cooldown
        if (this.punchCooldown > 0) {
            this.punchCooldown -= deltaTime;
        }
        
        // Update punch animation if active (has priority over walking animation)
        if (this.isPunching) {
            this.animatePunch(deltaTime);
        } 
        // Otherwise update walking animation
        else {
            this.animateWalking(deltaTime);
        }
        
        // Update double jump cooldown
        if (this.isOnGround && this.doubleJumpCooldown > 0) {
            this.doubleJumpCooldown -= deltaTime;
            if (this.doubleJumpCooldown <= 0) {
                this.doubleJumpCooldown = 0;
                this.canDoubleJump = true;
            }
        }
    }
}; 