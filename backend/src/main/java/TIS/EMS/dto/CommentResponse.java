package TIS.EMS.dto;

import TIS.EMS.models.ExpenseComment;

import java.time.Instant;

public record CommentResponse(Long id, PersonResponse author, String text, Instant createdAt) {
    public static CommentResponse from(ExpenseComment c) {
        return new CommentResponse(c.getId(), PersonResponse.from(c.getAuthor()), c.getText(), c.getCreatedAt());
    }
}
