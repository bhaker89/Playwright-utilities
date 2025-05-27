package com.onemg.fulfillment.utils;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.PutObjectRequest;

public class AWSS3Util {

	public String uploadFileToS3Bucket(AmazonS3 s3Client,String file_path) throws IOException {
        String bucket_name = "stag-1mg-auto-resize-images-dev";
        String key_name = Paths.get(file_path).getFileName().toString();
        String objectContent = new String(Files.readAllBytes(Paths.get(file_path)));
        byte[] objectBytes = objectContent.getBytes();
        ObjectMetadata objectMetadata = new ObjectMetadata();
        objectMetadata.setContentType("text/txt");
        objectMetadata.setSSEAlgorithm(ObjectMetadata.AES_256_SERVER_SIDE_ENCRYPTION);
        PutObjectRequest putRequest = new PutObjectRequest(bucket_name,
                key_name,
                new ByteArrayInputStream(objectBytes),
                objectMetadata);

        s3Client.putObject(putRequest);
        String s3Url = s3Client.getUrl(bucket_name, key_name).toString();
        return s3Url;
    }
}
