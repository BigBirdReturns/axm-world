import connectedFixtureJson from "../../../cartridges/relief-circuit-lamp-district.run.json";
import { LAMP_DISTRICT } from "../../arcs/lamp-district.js";
import {
  CONNECTED_OPERATION_EXTENSION_KEY,
  buildConnectedOperation,
  parseConnectedOperation,
  type ConnectedOperationV1,
  type ConnectedReturnLedger,
} from "../../engine/connected-operation.js";
import { foundOrganization } from "../../engine/founding.js";
import { connectedOperationFromRun } from "../../engine/connected-operation.js";
import { parsePortableRun, type JsonValue, type PortableRunExtensions } from "../../engine/portable-run.js";
import type { Arc, Organization, RunReport } from "../../engine/types.js";

const restoredFixture = parsePortableRun(connectedFixtureJson);
const fixtureConnection = connectedOperationFromRun(restoredFixture);
if (!fixtureConnection) throw new Error("The accepted Relief Circuit fixture has no connected operation.");

const fixtureOperation = fixtureConnection.operation;
const fixtureDestination = fixtureConnection.destination;

function stateSnapshot(org: Organization): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(org.cartridgeState ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, value]),
  );
}

function existingSourceBefore(extensions: PortableRunExtensions, arc: Arc): Record<string, string | number | boolean | null> | null {
  const value = extensions[CONNECTED_OPERATION_EXTENSION_KEY];
  if (value === undefined) return null;
  try {
    return parseConnectedOperation(value, arc).operation.returnLedger.sourceStateBefore;
  } catch {
    return null;
  }
}

/**
 * Project the accepted Gate 5 connected-operation law into the held source run.
 * World supplies no transfer facts or destination outcomes. It uses the accepted
 * Arc fixture, the current engine-owned source state, and the exact Lamp District
 * engine state carried by that fixture.
 */
export function connectedOperationForReport(params: {
  arc: Arc;
  org: Organization;
  report: RunReport;
  extensions: PortableRunExtensions;
}): JsonValue | null {
  const { arc, org, report, extensions } = params;
  if (arc.meta.id !== "relief-circuit" || report.outcome !== "success") return null;

  if (report.challengeId === "conduct-the-lamp-relief-descent") {
    const destinationOrg = foundOrganization(LAMP_DISTRICT);
    const { operation } = buildConnectedOperation({
      sourceArc: arc,
      sourceOrg: org,
      destinationArc: LAMP_DISTRICT,
      destinationOrg,
      transfer: fixtureOperation.transfer,
      sourceExtensions: extensions,
      status: "outbound",
    });
    return operation as unknown as JsonValue;
  }

  if (report.challengeId !== "carry-the-returning-constitution") return null;

  const destinationBefore = stateSnapshot(foundOrganization(LAMP_DISTRICT));
  const destinationAfter = stateSnapshot(fixtureDestination.org);
  const sourceAfter = stateSnapshot(org);
  const sourceBefore = existingSourceBefore(extensions, arc)
    ?? fixtureOperation.returnLedger.sourceStateBefore;
  const returnLedger: ConnectedReturnLedger = {
    sourceStateBefore: sourceBefore,
    sourceStateAfter: sourceAfter,
    destinationStateBefore: destinationBefore,
    destinationStateAfter: destinationAfter,
    inheritedFacts: [...fixtureOperation.returnLedger.inheritedFacts],
  };
  const { operation } = buildConnectedOperation({
    sourceArc: arc,
    sourceOrg: org,
    destinationArc: LAMP_DISTRICT,
    destinationOrg: fixtureDestination.org,
    transfer: fixtureOperation.transfer,
    sourceExtensions: extensions,
    destinationExtensions: fixtureDestination.extensions,
    returnLedger,
    status: "returned",
  });
  return operation as unknown as JsonValue;
}

export function readConnectedReliefOperation(arc: Arc, extensions: PortableRunExtensions): ConnectedOperationV1 | null {
  const value = extensions[CONNECTED_OPERATION_EXTENSION_KEY];
  if (value === undefined) return null;
  try {
    return parseConnectedOperation(value, arc).operation;
  } catch {
    return null;
  }
}
