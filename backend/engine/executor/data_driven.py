"""Data-driven test module for ForgeEngine.

Per spec FR-015: Substitute ${variable} placeholders with row values.
Per spec acceptance scenario 3: Continue on row failure.
Per spec acceptance scenario 5: Include data_row_index in events.
"""

import re
from typing import Dict, Any, List, Optional


class DataDrivenExecutor:
    """Handles data-driven test execution with parameter substitution."""

    PLACEHOLDER_PATTERN = re.compile(r"\$\{(\w+)\}")

    def __init__(self):
        """Initialize data-driven executor."""
        pass

    def substitute_parameters(self, template: Any, row_data: Dict[str, Any]) -> Any:
        """Substitute ${variable} placeholders with row values.

        Args:
            template: Template value (string, dict, or list)
            row_data: Data row values for substitution

        Returns:
            Value with placeholders substituted
        """
        if isinstance(template, str):
            # String substitution
            result = template
            for match in self.PLACEHOLDER_PATTERN.finditer(template):
                var_name = match.group(1)
                placeholder = f"${{{var_name}}}"

                if var_name in row_data:
                    result = result.replace(placeholder, str(row_data[var_name]))

            return result

        elif isinstance(template, dict):
            # Dict substitution (recursive)
            return {
                key: self.substitute_parameters(value, row_data) for key, value in template.items()
            }

        elif isinstance(template, list):
            # List substitution (recursive)
            return [self.substitute_parameters(item, row_data) for item in template]

        else:
            # Primitive types - return as-is
            return template

    def validate_row_consistency(self, rows: List[Dict[str, Any]]) -> tuple[bool, Optional[str]]:
        """Validate that all data rows have consistent keys.

        Args:
            rows: List of data rows to validate

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not rows:
            return True, None

        # Get keys from first row
        first_keys = set(rows[0].keys())

        # Compare with all other rows
        for i, row in enumerate(rows[1:], 1):
            if set(row.keys()) != first_keys:
                diff_in_first = first_keys - set(row.keys())
                diff_in_current = set(row.keys()) - first_keys
                diff_parts = []

                if diff_in_first:
                    diff_parts.append(f"Row {i} missing keys: {', '.join(diff_in_first)}")
                if diff_in_current:
                    diff_parts.append(f"Row {i} has extra keys: {', '.join(diff_in_current)}")

                return False, "Data rows have inconsistent keys:\n" + "\n".join(
                    f"  - {part}" for part in diff_parts
                )

        return True, None

    def execute_with_data(
        self,
        execute_func,
        script,
        data_rows: Optional[List[Dict[str, Any]]],
        continue_on_failure: bool = True,
    ) -> List[Dict[str, Any]]:
        """Execute script with data-driven rows.

        Args:
            execute_func: Function to execute script with row
            script: Script to execute
            data_rows: Optional list of data rows
            continue_on_failure: Whether to continue on row failure

        Returns:
            List of per-row results
        """
        rows = data_rows if data_rows else [{}]
        results = []

        for row_index, row_data in enumerate(rows):
            try:
                # Execute with row data
                result = execute_func(script, row_data, row_index)
                results.append(
                    {
                        "row_index": row_index,
                        "status": "completed",
                        "result": result,
                    }
                )

            except Exception as e:
                results.append(
                    {
                        "row_index": row_index,
                        "status": "failed",
                        "error": str(e),
                    }
                )

                if not continue_on_failure:
                    raise

        return results

    def get_row_summary(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get summary of data-driven execution results.

        Args:
            results: List of per-row results

        Returns:
            Summary with pass/fail counts
        """
        total = len(results)
        passed = sum(1 for r in results if r["status"] == "completed")
        failed = sum(1 for r in results if r["status"] == "failed")

        return {
            "total": total,
            "passed": passed,
            "failed": failed,
            "success_rate": (passed / total * 100) if total > 0 else 0,
        }
