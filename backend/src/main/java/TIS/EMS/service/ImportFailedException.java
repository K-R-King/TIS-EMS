package TIS.EMS.service;

import java.util.List;

/** An import was rejected; nothing was saved. Each problem names its spreadsheet row. */
public class ImportFailedException extends RuntimeException {
    private final List<String> problems;
    private final boolean onlyDuplicates;

    public ImportFailedException(String message, List<String> problems) {
        this(message, problems, false);
    }

    /** onlyDuplicates: every problem is a possible duplicate, so the file can be imported with allowDuplicates. */
    public ImportFailedException(String message, List<String> problems, boolean onlyDuplicates) {
        super(message);
        this.problems = problems;
        this.onlyDuplicates = onlyDuplicates;
    }

    public List<String> getProblems() { return problems; }
    public boolean isOnlyDuplicates() { return onlyDuplicates; }
}
