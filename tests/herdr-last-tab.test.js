import { expect, test } from "bun:test";
import { recordFocus, lastVisited } from "../herdr-plugins/last-tab/history.js";

const tabs = ["w1:t1", "w1:t2", "w1:t3"];

test("toggles between the two most recently selected tabs", () => {
  let history = [];
  for (const id of ["w1:t1", "w1:t3", "w1:t2"]) history = recordFocus(history, id);
  const target = lastVisited(history, "w1:t2", tabs);
  expect(target).toBe("w1:t3");
  history = recordFocus(history, target);
  expect(lastVisited(history, target, tabs)).toBe("w1:t2");
});

test("repeated focus does not overwrite the previous tab", () => {
  const history = recordFocus(recordFocus(["w1:t1"], "w1:t2"), "w1:t2");
  expect(lastVisited(history, "w1:t2", tabs)).toBe("w1:t1");
});

test("skips closed tabs and tabs moved to another workspace", () => {
  expect(lastVisited(["w1:t2", "w2:t1", "closed", "w1:t1"], "w1:t2", tabs)).toBe("w1:t1");
});

test("does nothing without a previously visited surviving tab", () => {
  expect(lastVisited([], "w1:t1", tabs)).toBeUndefined();
  expect(lastVisited(["w1:t1", "closed"], "w1:t1", tabs)).toBeUndefined();
});

test("workspace history toggles by visit order and skips closed workspaces", () => {
  let history = ["w1"];
  for (const id of ["w3", "w2", "w2"]) history = recordFocus(history, id);
  const target = lastVisited(history, "w2", ["w1", "w2", "w3"]);
  expect(target).toBe("w3");
  expect(lastVisited(recordFocus(history, target), target, ["w1", "w2", "w3"])).toBe("w2");
  expect(lastVisited(history, "w2", ["w1", "w2"])).toBe("w1");
  expect(lastVisited(history, "w2", ["w2"])).toBeUndefined();
});
