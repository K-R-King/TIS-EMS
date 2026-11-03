package TIS.EMS.service;

import java.util.List;

/** An import was rejected; nothing was saved. Each problem names its spreadsheet row. */
public class ImportFailedException extends RuntimeException {
    private final List<String> problems;

    public ImportFailedException(String message, List<String> problems) {
        super(message);
        this.problems = problems;
    }

    public List<String> getProblems() { return problems; }
}
