local workspace = game:GetService("Workspace")

local map = workspace:WaitForChild("Map")
local cloudEnvironment = map:WaitForChild("CloudEnvironment")
local emitterPlane = cloudEnvironment:WaitForChild("CloudEmitterPlane")

local function sequence(values)
	local keypoints = {}

	for _, value in values do
		table.insert(keypoints, NumberSequenceKeypoint.new(value[1], value[2], value[3] or 0))
	end

	return NumberSequence.new(keypoints)
end

local function colorSequence(startColor, endColor)
	return ColorSequence.new({
		ColorSequenceKeypoint.new(0, startColor),
		ColorSequenceKeypoint.new(1, endColor),
	})
end

local presets = {
	CloudLayerLower = {
		Lifetime = NumberRange.new(24, 30),
		Speed = NumberRange.new(0.2, 0.45),
		SpreadAngle = Vector2.new(180, 180),
		Rotation = NumberRange.new(0, 360),
		RotSpeed = NumberRange.new(-1, 1),
		Size = sequence({ { 0, 80, 0 }, { 1, 105, 0 } }),
		Transparency = sequence({ { 0, 0.18, 0 }, { 0.7, 0.28, 0 }, { 1, 1, 0 } }),
		Color = colorSequence(Color3.new(1, 0.95, 0.98), Color3.new(0.92, 0.89, 0.98)),
	},

	CloudLayerMiddle = {
		Lifetime = NumberRange.new(20, 26),
		Speed = NumberRange.new(0.35, 0.7),
		SpreadAngle = Vector2.new(180, 180),
		Rotation = NumberRange.new(0, 360),
		RotSpeed = NumberRange.new(-2, 2),
		Size = sequence({ { 0, 60, 0 }, { 1, 85, 0 } }),
		Transparency = sequence({ { 0, 0.28, 0 }, { 0.75, 0.38, 0 }, { 1, 1, 0 } }),
		Color = colorSequence(Color3.new(1, 0.96, 0.99), Color3.new(0.9, 0.88, 0.97)),
	},

	CloudLayerUpper = {
		Lifetime = NumberRange.new(16, 22),
		Speed = NumberRange.new(0.5, 1),
		SpreadAngle = Vector2.new(180, 180),
		Rotation = NumberRange.new(0, 360),
		RotSpeed = NumberRange.new(-3, 3),
		Size = sequence({ { 0, 42, 0 }, { 1, 65, 0 } }),
		Transparency = sequence({ { 0, 0.45, 0 }, { 0.7, 0.58, 0 }, { 1, 1, 0 } }),
		Color = colorSequence(Color3.new(1, 0.96, 0.99), Color3.new(0.91, 0.9, 0.98)),
	},
}

for emitterName, properties in presets do
	local emitter = emitterPlane:FindFirstChild(emitterName)

	if emitter and emitter:IsA("ParticleEmitter") then
		for property, value in properties do
			emitter[property] = value
		end
	end
end
