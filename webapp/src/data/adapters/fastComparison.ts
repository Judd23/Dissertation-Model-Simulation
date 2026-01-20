import { PageShell, Section, Card } from "../components/ui"; // adjust imports as needed
import React from "react";

export default function DemographicsPage(props) {
  const { modelResults, doseEffects, sampleDescriptives, fastComparison } = props.data;

  if (!modelResults || !doseEffects || !sampleDescriptives) {
    return (
      <PageShell>
        <Section>
          <Card>
            <h2>Data not available yet</h2>
            <p>
              The dashboard is running, but the required JSON files did not load into valid objects. Check the console validation warnings for details.
            </p>
          </Card>
        </Section>
      </PageShell>
    );
  }

  // Example of null-safe Object.keys usage around line ~439
  // Replace Object.keys(someVar) with Object.keys(someVar ?? {})
  const keys = Object.keys(modelResults ?? {});

  // rest of the component code...
}
