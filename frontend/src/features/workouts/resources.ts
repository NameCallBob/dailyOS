/**
 * features/workouts/resources.ts — 本模組的 createResource 綁定。
 * 四張表皆為完整 CRUD（試用走 Dexie + seed，登入走 /api/v1/{name}/）。
 */

import { createResource } from "@/lib/resource";

import {
  exerciseDefSchema,
  workoutExerciseSchema,
  workoutSchema,
  workoutSetSchema,
  type ExerciseDef,
  type Workout,
  type WorkoutExercise,
  type WorkoutSet,
} from "./schema";
import { seedExerciseDefs, seedWorkoutExercises, seedWorkoutSets, seedWorkouts } from "./seed";

export const workoutsResource = createResource<Workout>({
  name: "workouts",
  schema: workoutSchema,
  seed: seedWorkouts,
});

export const exerciseDefsResource = createResource<ExerciseDef>({
  name: "exercise_defs",
  schema: exerciseDefSchema,
  seed: seedExerciseDefs,
});

export const workoutExercisesResource = createResource<WorkoutExercise>({
  name: "workout_exercises",
  schema: workoutExerciseSchema,
  seed: seedWorkoutExercises,
});

export const workoutSetsResource = createResource<WorkoutSet>({
  name: "workout_sets",
  schema: workoutSetSchema,
  seed: seedWorkoutSets,
});
